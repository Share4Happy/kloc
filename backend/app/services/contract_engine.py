import io
import re
from datetime import datetime
from pathlib import Path

from docx import Document
from jinja2 import StrictUndefined, Template

from app.schemas.contract import ContractGenerateRequest

# Define the template path relative to this file
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
DEFAULT_TEMPLATE_PATH = TEMPLATE_DIR / "contract_template.md"


class ContractEngineError(Exception):
    """Base exception for Contract Engine service."""
    pass


def _build_contract_context(request: ContractGenerateRequest) -> dict:
    now = datetime.now()
    context = request.model_dump()

    context["total_amount"] = f"{request.total_amount:,}".replace(",", ".")
    context["deposit_amount"] = f"{request.deposit_amount:,}".replace(",", ".")
    context.update(
        {
            "day": f"{now.day:02d}",
            "month": f"{now.month:02d}",
            "year": str(now.year),
        }
    )
    return context


def _render_markdown_template(template_path: Path, context: dict) -> str:
    try:
        source = template_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ContractEngineError(f"Khong the doc template Markdown: {exc}") from exc

    try:
        return Template(source, undefined=StrictUndefined).render(**context)
    except Exception as exc:
        raise ContractEngineError(f"Loi khi render template Markdown: {exc}") from exc


def _append_inline_markdown(paragraph, text: str) -> None:
    """Support simple inline markdown `**bold**` when exporting to DOCX."""
    for token in re.split(r"(\*\*[^*]+\*\*)", text):
        if not token:
            continue

        if token.startswith("**") and token.endswith("**") and len(token) > 4:
            run = paragraph.add_run(token[2:-2])
            run.bold = True
        else:
            paragraph.add_run(token)


def _markdown_to_docx_buffer(rendered_markdown: str) -> io.BytesIO:
    document = Document()

    for raw_line in rendered_markdown.splitlines():
        line = raw_line.rstrip()
        stripped_line = line.strip()

        if not stripped_line:
            document.add_paragraph("")
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped_line)
        if heading_match:
            level = min(len(heading_match.group(1)), 4)
            heading = document.add_heading(level=level)
            _append_inline_markdown(heading, heading_match.group(2).strip())
            continue

        bullet_match = re.match(r"^[-*]\s+(.*)$", stripped_line)
        if bullet_match:
            paragraph = document.add_paragraph(style="List Bullet")
            _append_inline_markdown(paragraph, bullet_match.group(1).strip())
            continue

        number_match = re.match(r"^\d+\.\s+(.*)$", stripped_line)
        if number_match:
            paragraph = document.add_paragraph(style="List Number")
            _append_inline_markdown(paragraph, number_match.group(1).strip())
            continue

        paragraph = document.add_paragraph()
        _append_inline_markdown(paragraph, stripped_line)

    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_contract_docx(
    request: ContractGenerateRequest,
    template_path: Path = DEFAULT_TEMPLATE_PATH,
) -> io.BytesIO:
    """Generate a `.docx` contract from a markdown template.

    Returns:
        io.BytesIO: In-memory byte buffer containing the generated document.
    """
    if not template_path.exists():
        raise ContractEngineError(f"Khong tim thay template tai: {template_path}")

    context = _build_contract_context(request)
    suffix = template_path.suffix.lower()

    if suffix not in {".md", ".markdown"}:
        raise ContractEngineError("Template khong duoc ho tro. Chi chap nhan .md/.markdown.")

    rendered_markdown = _render_markdown_template(template_path, context)
    return _markdown_to_docx_buffer(rendered_markdown)
