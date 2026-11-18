from pydantic import BaseModel, ConfigDict, Field


class ContractGenerateRequest(BaseModel):
    """Payload to generate a DOCX contract."""

    customer_name: str = Field(..., description="Tên khách hàng hoặc công ty")
    customer_representative: str = Field(..., description="Người đại diện")
    kol_name: str = Field(..., description="Tên KOL/KOC")
    platform: str = Field(default="TikTok", description="Nền tảng (TikTok, YouTube...)")
    post_count: int = Field(default=1, ge=1, description="Số lượng content")
    kpi: str = Field(..., description="Mô tả KPI (VD: 100k views, 5k likes)")
    total_amount: int = Field(..., ge=0, description="Tổng giá trị hợp đồng (VNĐ)")
    deposit_amount: int = Field(..., ge=0, description="Số tiền cọc (VNĐ)")
    
    # Allows passing extra variables that might be added to the template later
    model_config = ConfigDict(extra="allow")

