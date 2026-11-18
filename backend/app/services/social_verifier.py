"""Social link verification service.

Current behavior:
- Validate public URL format.
- Perform a lightweight reachability check.
- Inspect canonical/OG metadata to estimate ownership confidence.
- Extract follower counts from public HTML when platforms expose them.

This is still heuristic and does not replace a first-party platform API,
but it gives managers a clearer ownership/follower signal than pure regex.
"""

import functools
import re
import time
from datetime import datetime, timezone
from html import unescape
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

from app.schemas.kol import SocialCheckResult

_PLATFORM_PATTERNS: dict[str, re.Pattern] = {
    "tiktok": re.compile(r"^https?://(www\.)?tiktok\.com/@[A-Za-z0-9._-]+/?([?#].*)?$", re.IGNORECASE),
    "youtube": re.compile(r"^https?://(www\.)?youtube\.com/(@[A-Za-z0-9._-]+|channel/[A-Za-z0-9_-]+|c/[A-Za-z0-9._-]+|user/[A-Za-z0-9._-]+)/?([?#].*)?$", re.IGNORECASE),
    "instagram": re.compile(r"^https?://(www\.)?instagram\.com/[A-Za-z0-9._-]+/?([?#].*)?$", re.IGNORECASE),
    "facebook": re.compile(r"^https?://(www\.)?facebook\.com/[A-Za-z0-9.\-_]+/?([?#].*)?$", re.IGNORECASE),
}

_FOLLOWER_PATTERNS: dict[str, tuple[re.Pattern, ...]] = {
    "tiktok": (
        re.compile(r'"followerCount"\s*:\s*(\d+)', re.IGNORECASE),
        re.compile(r'([0-9.,]+\s*[KMB]?)\s+followers', re.IGNORECASE),
    ),
    "youtube": (
        re.compile(r'"subscriberCountText".*?"simpleText"\s*:\s*"([^"]+?) subscribers"', re.IGNORECASE),
        re.compile(r'"label"\s*:\s*"([^"]+?) subscribers"', re.IGNORECASE),
        re.compile(r'([0-9.,]+\s*(?:K|M|B|thousand|million|billion)?)\s+subscribers', re.IGNORECASE),
    ),
    "instagram": (
        re.compile(r'"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)', re.IGNORECASE),
        re.compile(r'([0-9.,]+\s*[KMB]?)\s+Followers', re.IGNORECASE),
    ),
    "facebook": (
        re.compile(r'([0-9.,]+\s*[KMB]?)\s+followers', re.IGNORECASE),
        re.compile(r'"followers"\s*:\s*"?([0-9.,]+\s*[KMB]?)"?', re.IGNORECASE),
    ),
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean_html_text(value: str | None) -> str:
    if not value:
        return ""
    text = unescape(value)
    text = text.replace("\\u0026", "&")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_meta_content(html: str, attr_name: str, attr_value: str) -> str | None:
    pattern = re.compile(
        rf'<meta[^>]+{attr_name}=["\']{re.escape(attr_value)}["\'][^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    match = pattern.search(html)
    return _clean_html_text(match.group(1)) if match else None


def _extract_title(html: str) -> str | None:
    match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return _clean_html_text(match.group(1)) if match else None


def _extract_canonical_url(html: str) -> str | None:
    match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html, re.IGNORECASE)
    return _clean_html_text(match.group(1)) if match else None


_PAGE_SNAPSHOT_CACHE: dict[str, tuple[float, tuple[bool, str | None, str | None, str | None]]] = {}
_CACHE_TTL_SECONDS = 120


def _fetch_page_snapshot(url: str) -> tuple[bool, str | None, str | None, str | None]:
    """Fetch a small HTML snapshot for public-signal verification."""
    now = time.time()
    cached = _PAGE_SNAPSHOT_CACHE.get(url)
    if cached:
        cached_at, result = cached
        if now - cached_at < _CACHE_TTL_SECONDS:
            return result

    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; KLOC-SocialVerifier/2.0)",
            "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        },
    )

    try:
        with urlopen(req, timeout=8) as response:
            status = getattr(response, "status", 200)
            final_url = response.geturl()
            if not 200 <= status < 400:
                return False, f"Link trả về HTTP {status}.", final_url, None

            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return True, "Link truy cập được nhưng không trả về HTML công khai.", final_url, None

            charset = response.headers.get_content_charset() or "utf-8"
            raw = response.read(250_000)
            html = raw.decode(charset, errors="ignore")
            result = (True, None, final_url, html)
            _PAGE_SNAPSHOT_CACHE[url] = (now, result)
            return result
    except HTTPError as exc:
        if exc.code in (401, 403):
            result = (True, "Nền tảng giới hạn truy cập tự động (401/403), chỉ xác minh được tín hiệu URL công khai.", url, None)
            _PAGE_SNAPSHOT_CACHE[url] = (now, result)
            return result
        result = (False, f"Link trả về HTTP {exc.code}.", None, None)
        _PAGE_SNAPSHOT_CACHE[url] = (now, result)
        return result
    except URLError:
        result = (False, "Không thể truy cập link (DNS/mạng lỗi hoặc URL không tồn tại).", None, None)
        _PAGE_SNAPSHOT_CACHE[url] = (now, result)
        return result
    except Exception:
        result = (False, "Không thể xác minh link do lỗi hệ thống.", None, None)
        _PAGE_SNAPSHOT_CACHE[url] = (now, result)
        return result


def _normalize_signature(url: str | None) -> str | None:
    if not url:
        return None
    path = unquote(urlparse(url).path).rstrip("/")
    return path.lower() or None


def _signature_to_handle(signature: str | None) -> str | None:
    if not signature:
        return None
    return signature.strip("/")


def _looks_like_mismatch(platform: str, expected_signature: str | None, actual_signature: str | None) -> bool:
    if not expected_signature or not actual_signature:
        return False
    if platform == "youtube":
        expected_parts = expected_signature.strip("/").split("/", 1)
        actual_parts = actual_signature.strip("/").split("/", 1)
        if not expected_parts or not actual_parts:
            return False
        if expected_parts[0] != actual_parts[0]:
            return False
    return expected_signature != actual_signature


def _contains_identity_hint(expected_handle: str | None, *values: str | None) -> bool:
    if not expected_handle:
        return False
    identity = expected_handle.lower().replace("/", " ")
    identity = identity.replace("@", " ").replace("-", " ").replace("_", " ")
    tokens = [token for token in re.split(r"\s+", identity) if token]
    if not tokens:
        return False
    haystack = " ".join(_clean_html_text(value).lower() for value in values if value)
    return all(token in haystack for token in tokens if len(token) > 1)


def _extract_tiktok_follower_from_json(html: str | None) -> int | None:
    if not html:
        return None

    # TikTok often embeds profile data in several places, use robust patterns.
    candidates = []

    # 1) SIGI_STATE JSON block
    m = re.search(r'"UserModule"\s*:\s*\{.*?"stats"\s*:\s*\{.*?"followerCount"\s*:\s*(\d+)', html, re.DOTALL)
    if m:
        candidates.append(int(m.group(1)))

    # 2) __INIT_PROPS__ block or any JSON with followerCount
    m = re.search(r'"followerCount"\s*:\s*(\d+)', html)
    if m:
        candidates.append(int(m.group(1)))

    # 3) numeric shorthand in page (1.2M followers etc.)
    m = re.search(r'([0-9.,]+\s*[KMB]?)\s+followers', html, re.IGNORECASE)
    if m:
        val = _parse_compact_number(m.group(1))
        if val is not None:
            candidates.append(val)

    # 4) New TikTok HTML structure: <strong data-e2e="followers-count">8031</strong>
    m = re.search(r'<strong[^>]*data-e2e=["\']followers-count["\'][^>]*>([0-9.,]+)</strong>', html, re.IGNORECASE)
    if m:
        val = _parse_compact_number(m.group(1))
        if val is not None:
            candidates.append(val)

    # Return the max detected value to avoid undercounting from duplicate fragments.
    return max(candidates) if candidates else None


def _parse_compact_number(value: str) -> int | None:
    raw = value.strip().lower()
    raw = raw.replace("followers", "").replace("following", "").replace("subscriber", "").replace("subscribers", "")
    raw = raw.replace("people", "").replace("likes", "").strip()

    multiplier = 1
    for suffix, suffix_multiplier in (
        ("billion", 1_000_000_000),
        ("million", 1_000_000),
        ("thousand", 1_000),
        ("bn", 1_000_000_000),
        ("m", 1_000_000),
        ("k", 1_000),
    ):
        if raw.endswith(suffix):
            multiplier = suffix_multiplier
            raw = raw[: -len(suffix)].strip()
            break

    if multiplier > 1 and "," in raw and "." not in raw:
        raw = raw.replace(",", ".")
    else:
        raw = raw.replace(",", "")

    raw = re.sub(r"[^0-9.]", "", raw)
    if not raw:
        return None

    try:
        numeric = float(raw)
    except ValueError:
        return None
    return int(numeric * multiplier)


def _extract_follower_count(platform: str, html: str | None, *metadata_values: str | None) -> tuple[int | None, str | None]:
    values_to_scan = [html or "", *(value or "" for value in metadata_values)]

    # TikTok special extraction from embedded JSON + raw HTML first.
    if platform == "tiktok":
        tiktok_count = _extract_tiktok_follower_from_json(html)
        if tiktok_count is not None:
            return tiktok_count, "tiktok_json"

    for source_value in values_to_scan:
        if not source_value:
            continue
        for pattern in _FOLLOWER_PATTERNS.get(platform, ()):
            match = pattern.search(source_value)
            if not match:
                continue
            parsed_count = _parse_compact_number(match.group(1))
            if parsed_count is not None:
                source = "public_html" if source_value == (html or "") else "public_metadata"
                return parsed_count, source

    return None, None


def _evaluate_ownership(
    platform: str,
    expected_signature: str | None,
    final_signature: str | None,
    canonical_signature: str | None,
    identity_in_content: bool,
    follower_count: int | None,
) -> tuple[str, int, str]:
    score = 0

    if expected_signature:
        score += 25
    if final_signature and final_signature == expected_signature:
        score += 25
    elif final_signature and not _looks_like_mismatch(platform, expected_signature, final_signature):
        score += 10

    if canonical_signature and canonical_signature == expected_signature:
        score += 20
    elif canonical_signature and not _looks_like_mismatch(platform, expected_signature, canonical_signature):
        score += 10

    if identity_in_content:
        score += 20

    if follower_count is not None:
        score += 10

    score = min(score, 100)

    if _looks_like_mismatch(platform, expected_signature, final_signature) or _looks_like_mismatch(platform, expected_signature, canonical_signature):
        return "mismatch", min(score, 35), "Profile công khai trả về khác định danh đã khai báo."
    if score >= 80:
        return "verified", score, "Khớp URL công khai, metadata và định danh profile."
    if score >= 55:
        return "likely_owned", score, "Khớp đường dẫn công khai, nhưng tín hiệu ownership vẫn ở mức suy luận."
    return "unverified", score, "Link truy cập được nhưng chưa đủ tín hiệu ownership công khai."


def verify_social_links(social_links: dict | None) -> list[SocialCheckResult]:
    """Validate social media links using public ownership and follower heuristics."""
    if not social_links:
        return []

    results: list[SocialCheckResult] = []

    for platform, url in social_links.items():
        checked_at = _now()
        platform_lower = platform.lower()
        url_value = str(url)

        parsed = urlparse(url_value)
        if not parsed.scheme or not parsed.netloc:
            results.append(SocialCheckResult(
                platform=platform,
                url=url_value,
                is_valid=False,
                message="URL không hợp lệ: thiếu scheme hoặc domain.",
                ownership_status="unverified",
                confidence_score=0,
                checked_at=checked_at,
            ))
            continue

        pattern = _PLATFORM_PATTERNS.get(platform_lower)
        if pattern is None:
            results.append(SocialCheckResult(
                platform=platform,
                url=url_value,
                is_valid=False,
                message="Nền tảng chưa được hỗ trợ auto-check.",
                ownership_status="unverified",
                confidence_score=0,
                checked_at=checked_at,
            ))
            continue

        if not pattern.match(url_value):
            results.append(SocialCheckResult(
                platform=platform,
                url=url_value,
                is_valid=False,
                message=f"URL không khớp với định dạng {platform} chuẩn.",
                ownership_status="unverified",
                confidence_score=10,
                detected_handle=_signature_to_handle(_normalize_signature(url_value)),
                checked_at=checked_at,
            ))
            continue

        reachable, reachability_message, final_url, html = _fetch_page_snapshot(url_value)
        expected_signature = _normalize_signature(url_value)
        final_signature = _normalize_signature(final_url)

        if not reachable:
            results.append(SocialCheckResult(
                platform=platform,
                url=url_value,
                is_valid=False,
                message=reachability_message or "Link không thể truy cập.",
                ownership_status="unverified",
                confidence_score=25,
                detected_handle=_signature_to_handle(expected_signature),
                checked_at=checked_at,
            ))
            continue

        title = _extract_title(html or "")
        og_title = _extract_meta_content(html or "", "property", "og:title")
        description = _extract_meta_content(html or "", "name", "description")
        og_description = _extract_meta_content(html or "", "property", "og:description")
        canonical_url = _extract_canonical_url(html or "")
        og_url = _extract_meta_content(html or "", "property", "og:url")

        canonical_signature = _normalize_signature(canonical_url or og_url)
        detected_signature = canonical_signature or final_signature or expected_signature
        detected_handle = _signature_to_handle(detected_signature)
        expected_handle = _signature_to_handle(expected_signature)
        identity_in_content = _contains_identity_hint(expected_handle, title, og_title, description, og_description, html)
        follower_count, follower_source = _extract_follower_count(
            platform_lower,
            html,
            title,
            og_title,
            description,
            og_description,
        )

        ownership_status, confidence_score, ownership_note = _evaluate_ownership(
            platform_lower,
            expected_signature,
            final_signature,
            canonical_signature,
            identity_in_content,
            follower_count,
        )

        message_parts = [ownership_note]
        if reachability_message:
            message_parts.append(reachability_message)
        if follower_count is not None:
            message_parts.append(f"Follower public ghi nhận khoảng {follower_count:,}.".replace(",", "."))
        else:
            message_parts.append("Chưa trích xuất được follower realtime từ dữ liệu công khai.")

        results.append(SocialCheckResult(
            platform=platform,
            url=url_value,
            is_valid=ownership_status in {"verified", "likely_owned"},
            message=" ".join(message_parts),
            ownership_status=ownership_status,
            confidence_score=confidence_score,
            detected_handle=detected_handle,
            follower_count=follower_count,
            follower_source=follower_source,
            checked_at=checked_at,
        ))

    return results
