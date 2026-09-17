# -*- coding: utf-8 -*-
"""
Editor/gerador de fanzines em PDF para o projeto Tool Debate - Um conto por aluno.

Este módulo concentra as funções importáveis antes mantidas em fanzine_builder.py.
O notebook Colab com SDXL/Gemini foi preservado em notebook_pipeline.py.
"""

from __future__ import annotations

import importlib.util
import io
import os
import re
import runpy
import subprocess
import sys
from html import escape
from pathlib import Path
from typing import Optional


def _ensure_import(import_name: str, pip_name: Optional[str] = None) -> None:
    """Instala dependência mínima quando o módulo é executado em notebook limpo."""
    if importlib.util.find_spec(import_name) is not None:
        return
    package = pip_name or import_name
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", package])


_ensure_import("reportlab")

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Frame, Paragraph


# Configurações de página
PAGE_WIDTH, PAGE_HEIGHT = A5
MARGIN_LEFT = 0.7 * cm
MARGIN_RIGHT = 0.3 * cm
MARGIN_TOP = 1.5 * cm
MARGIN_BOTTOM = 1.5 * cm

# Área de texto útil
TEXT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
TEXT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# Logo plantao_escolar.png
LOGO_SIZE = 0.8 * cm
LOGO_FILENAME = "plantao_escolar.png"
LOGO_FILE_ID = os.environ.get("LOGO_FILE_ID", "1NnJ8lj3Sm6YBS4sIfvbHZPPIpJZ3UxQB").strip()
LOGO_DRIVE_URL = os.environ.get(
    "LOGO_DRIVE_URL",
    f"https://drive.google.com/file/d/{LOGO_FILE_ID}/view?usp=sharing" if LOGO_FILE_ID else "",
).strip()

# Cores
COLOR_PRIMARY = HexColor("#1a73e8")
COLOR_TEXT = HexColor("#202124")
COLOR_LIGHT = HexColor("#5f6368")

PROJECT_NAME = "Tool Debate - Um conto por aluno"
OUTPUT_DIR = Path(os.environ.get("PDF_OUTPUT_DIR", "/tmp/fanzines"))

FOLDER_ENV_KEYS = ("FOLDER_ID", "OUTPUT_FOLDER_ID", "DRIVE_FOLDER_ID")
LOGO_SOURCE_ENV_KEYS = ("LOGO_FILE_ID", "LOGO_DRIVE_FILE_ID", "LOGO_DRIVE_URL")

BODY_FONT_SIZE = 10
BODY_LEADING = 13
BODY_FIRST_LINE_INDENT = 0.35 * cm
BODY_PARAGRAPH_SPACE_AFTER = 0.12 * cm


def _read_secret(name: str) -> Optional[str]:
    """Read a value from Colab Secrets when running in Colab."""
    try:
        from google.colab import userdata  # type: ignore

        value = userdata.get(name)
        return value.strip() if isinstance(value, str) and value.strip() else None
    except Exception:
        return None


def get_config_value(keys: tuple[str, ...], required: bool = True) -> Optional[str]:
    """Read config from environment first, then from Colab Secrets."""
    for key in keys:
        value = os.environ.get(key)
        if value and value.strip():
            return value.strip()
    for key in keys:
        value = _read_secret(key)
        if value:
            return value
    if required:
        joined = ", ".join(keys)
        raise RuntimeError(f"Configure uma destas variáveis antes de executar: {joined}")
    return None


def authenticate_google():
    """Authenticate in Colab or reuse Application Default Credentials."""
    try:
        from google.colab import auth  # type: ignore

        auth.authenticate_user()
    except Exception:
        pass

    from google.auth import default

    credentials, _ = default(
        scopes=[
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive.readonly",
        ]
    )
    return credentials


def extract_drive_file_id(value: str) -> str:
    """Extrai o ID de arquivo de um ID cru ou URL do Google Drive."""
    value = (value or "").strip()
    if not value:
        return value

    patterns = (
        r"/file/d/([a-zA-Z0-9_-]+)",
        r"[?&]id=([a-zA-Z0-9_-]+)",
        r"/d/([a-zA-Z0-9_-]+)",
    )
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return match.group(1)
    return value


def _drive_query_string_literal(value: str) -> str:
    """Escapa string para literal simples em query do Drive."""
    return value.replace("\\", "\\\\").replace("'", "\\'")


def download_file_from_drive(file_id_or_name: str, credentials) -> Optional[bytes]:
    """Download a file from Google Drive by ID or search by name in FOLDER_ID."""
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseDownload

        service = build("drive", "v3", credentials=credentials)
        source = (file_id_or_name or "").strip()
        file_id = extract_drive_file_id(source)

        if file_id == source and not source.startswith("http") and len(source) < 50 and "." in source:
            folder_id = get_config_value(FOLDER_ENV_KEYS, required=False)
            if folder_id:
                safe_name = _drive_query_string_literal(source)
                safe_folder_id = _drive_query_string_literal(folder_id)
                query = f"name='{safe_name}' and '{safe_folder_id}' in parents and trashed=false"
                results = (
                    service.files()
                    .list(
                        q=query,
                        fields="files(id, name, mimeType)",
                        pageSize=10,
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True,
                    )
                    .execute()
                )
                files = results.get("files", [])
                if files:
                    file_id = files[0]["id"]
                    print(f"Arquivo encontrado: {files[0]['name']} (ID: {file_id})")

        request = service.files().get_media(fileId=file_id)
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)

        done = False
        while not done:
            _status, done = downloader.next_chunk()

        file_buffer.seek(0)
        return file_buffer.read()
    except Exception as exc:
        print(f"Erro ao baixar arquivo do Drive: {exc}")
        return None


def download_logo_from_drive(credentials, source: Optional[str] = None) -> Optional[bytes]:
    """Baixa plantao_escolar.png pelo FOLDER_ID e usa o ID/link conhecido como fallback."""
    candidates: list[str] = []
    if source:
        candidates.append(source)

    for key in LOGO_SOURCE_ENV_KEYS:
        value = os.environ.get(key, "").strip()
        if value:
            candidates.append(value)

    candidates.extend([LOGO_FILENAME, LOGO_DRIVE_URL, LOGO_FILE_ID])

    seen: set[str] = set()
    for candidate in candidates:
        normalized = candidate.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        logo_bytes = download_file_from_drive(normalized, credentials)
        if logo_bytes:
            return logo_bytes

    return None


def wrap_text(text: str, max_width: float, font_name: str, font_size: int) -> list[str]:
    """Quebra texto em linhas que cabem na largura especificada."""
    from reportlab.pdfbase.pdfmetrics import stringWidth

    words = text.split()
    lines: list[str] = []
    current_line: list[str] = []

    for word in words:
        test_line = " ".join(current_line + [word])
        if stringWidth(test_line, font_name, font_size) <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]

    if current_line:
        lines.append(" ".join(current_line))

    return lines


def normalize_story_paragraphs(text: str) -> list[str]:
    """Converte quebras internas em parágrafos compactos para diagramação."""
    lines = [line.strip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    paragraphs: list[str] = []
    current: list[str] = []

    for line in lines:
        if not line:
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue
        current.append(line)

    if current:
        paragraphs.append(" ".join(current))

    return [" ".join(paragraph.split()) for paragraph in paragraphs if paragraph.strip()]


def create_cover_page(c: canvas.Canvas, title: str, author: str = "") -> None:
    """Cria a capa do fanzine."""
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(COLOR_PRIMARY)

    title_lines = wrap_text(title, TEXT_WIDTH, "Helvetica-Bold", 18)
    y_pos = PAGE_HEIGHT / 2 + 2 * cm

    for line in title_lines:
        text_width = c.stringWidth(line, "Helvetica-Bold", 18)
        x_pos = (PAGE_WIDTH - text_width) / 2
        c.drawString(x_pos, y_pos, line)
        y_pos -= 0.7 * cm

    if author:
        c.setFont("Helvetica", 12)
        c.setFillColor(COLOR_LIGHT)
        y_pos -= 0.5 * cm
        text_width = c.stringWidth(author, "Helvetica", 12)
        x_pos = (PAGE_WIDTH - text_width) / 2
        c.drawString(x_pos, y_pos, author)

    c.showPage()


def create_back_cover(c: canvas.Canvas, logo_bytes: Optional[bytes], ods_list: list[str]) -> None:
    """Cria a contracapa com logo centralizado e até 3 ODS abaixo."""
    logo_x = (PAGE_WIDTH - LOGO_SIZE) / 2
    logo_y = PAGE_HEIGHT - MARGIN_TOP - LOGO_SIZE - 2 * cm

    if logo_bytes:
        try:
            image = ImageReader(io.BytesIO(logo_bytes))
            c.drawImage(
                image,
                logo_x,
                logo_y,
                width=LOGO_SIZE,
                height=LOGO_SIZE,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception as exc:
            print(f"Erro ao adicionar logo: {exc}")
            c.setStrokeColor(COLOR_LIGHT)
            c.setLineWidth(1)
            c.rect(logo_x, logo_y, LOGO_SIZE, LOGO_SIZE)

    ods_y = logo_y - 1.5 * cm
    ods_display = ods_list[:3]

    if ods_display:
        title_text = "ODS relacionados:"
        title_width = c.stringWidth(title_text, "Helvetica-Bold", 10)
        title_x = (PAGE_WIDTH - title_width) / 2
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(COLOR_TEXT)
        c.drawString(title_x, ods_y, title_text)
        ods_y -= 0.6 * cm

        c.setFont("Helvetica", 9)
        for ods in ods_display:
            ods_text = f"- {ods}"
            text_width = c.stringWidth(ods_text, "Helvetica", 9)
            text_x = (PAGE_WIDTH - text_width) / 2
            c.drawString(text_x, ods_y, ods_text)
            ods_y -= 0.5 * cm

    c.setFont("Helvetica", 8)
    c.setFillColor(COLOR_LIGHT)
    footer_text = PROJECT_NAME
    footer_width = c.stringWidth(footer_text, "Helvetica", 8)
    footer_x = (PAGE_WIDTH - footer_width) / 2
    c.drawString(footer_x, MARGIN_BOTTOM, footer_text)

    c.showPage()


def create_text_page(c: canvas.Canvas, text: str, page_num: int = 1) -> None:
    """Cria uma ou mais páginas de texto do conto."""
    body_style = ParagraphStyle(
        "FanzineBody",
        fontName="Helvetica",
        fontSize=BODY_FONT_SIZE,
        leading=BODY_LEADING,
        textColor=COLOR_TEXT,
        alignment=TA_JUSTIFY,
        firstLineIndent=BODY_FIRST_LINE_INDENT,
        spaceBefore=0,
        spaceAfter=BODY_PARAGRAPH_SPACE_AFTER,
        splitLongWords=1,
        spaceShrinkage=0.08,
        justifyBreaks=0,
        justifyLastLine=0,
    )
    story = [Paragraph(escape(paragraph), body_style) for paragraph in normalize_story_paragraphs(text)]
    if not story:
        story = [Paragraph(" ", body_style)]

    while story:
        frame = Frame(
            MARGIN_LEFT,
            MARGIN_BOTTOM,
            TEXT_WIDTH,
            TEXT_HEIGHT,
            showBoundary=0,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        page_started_with = len(story)

        while story:
            flowable = story[0]
            if frame.add(flowable, c):
                story.pop(0)
                continue

            split_flowables = flowable.split(frame._aW, frame._aH)
            if split_flowables and frame.add(split_flowables[0], c):
                story = split_flowables[1:] + story[1:]
            break

        _draw_page_number(c, page_num)
        c.showPage()
        page_num += 1

        if len(story) == page_started_with:
            raise RuntimeError("Não foi possível diagramar um parágrafo do conto no espaço disponível.")


def _draw_page_number(c: canvas.Canvas, page_num: int) -> None:
    c.setFont("Helvetica", 8)
    c.setFillColor(COLOR_LIGHT)
    page_text = str(page_num)
    page_width = c.stringWidth(page_text, "Helvetica", 8)
    c.drawString((PAGE_WIDTH - page_width) / 2, MARGIN_BOTTOM / 2, page_text)


def create_fanzine_pdf(
    output_path: Path,
    title: str,
    body_text: str,
    author: str = "",
    ods_list: Optional[list[str]] = None,
    logo_bytes: Optional[bytes] = None,
) -> Path:
    """Cria um PDF de fanzine completo em formato A5."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=A5)
    c.setTitle(title)
    if author:
        c.setAuthor(author)
    c.setCreator("notebook_editor.py")

    create_cover_page(c, title, author)
    create_text_page(c, body_text)
    create_back_cover(c, logo_bytes, ods_list or [])

    c.save()
    print(f"Fanzine criado: {output_path}")
    return output_path


def validate_pdf_visually(pdf_path: Path) -> bool:
    """Valida visualmente o PDF gerado exibindo informações sobre o arquivo."""
    try:
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            from pypdf import PdfReader  # type: ignore

        pdf_path = Path(pdf_path)
        reader = PdfReader(str(pdf_path))
        print(f"\n{'=' * 60}")
        print(f"Validação Visual do PDF: {pdf_path.name}")
        print(f"{'=' * 60}")
        print(f"Número de páginas: {len(reader.pages)}")
        print(f"Tamanho do arquivo: {pdf_path.stat().st_size / 1024:.2f} KB")

        first_page = reader.pages[0]
        mediabox = first_page.mediabox
        width_cm = float(mediabox.width) / 72 * 2.54
        height_cm = float(mediabox.height) / 72 * 2.54

        print(f"Dimensões da página: {width_cm:.2f} cm x {height_cm:.2f} cm")
        print("Formato esperado (A5): 14.8 cm x 21.0 cm")
        print("\nMargens configuradas:")
        print("  - Esquerda: 0.7 cm")
        print("  - Direita: 0.3 cm")
        print("  - Superior/Inferior: 1.5 cm")
        print("\nLogo na contracapa:")
        print("  - Tamanho: 0.8 cm x 0.8 cm")
        print("  - Posição: Centralizada")
        print(f"{'=' * 60}\n")

        return True
    except Exception as exc:
        print(f"Erro na validação: {exc}")
        return False


def upload_pdf_to_drive(path: Path, credentials) -> Optional[dict]:
    """Upload PDF to Google Drive FOLDER_ID."""
    folder_id = get_config_value(FOLDER_ENV_KEYS, required=False)
    if not folder_id:
        print("FOLDER_ID não configurado; mantendo apenas cópia local do PDF.")
        return None

    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload

        path = Path(path)
        service = build("drive", "v3", credentials=credentials)
        media = MediaFileUpload(str(path), mimetype="application/pdf", resumable=True)
        created = (
            service.files()
            .create(
                body={"name": path.name, "parents": [folder_id]},
                media_body=media,
                fields="id, webViewLink",
            )
            .execute()
        )
        print(f"PDF enviado ao Drive: {created.get('webViewLink') or created.get('id')}")
        return created
    except Exception as exc:
        print(f"Aviso: falha ao enviar {path.name} para FOLDER_ID ({exc}).")
        return None


def upload_to_drive(path: Path, credentials) -> Optional[dict]:
    """Alias compatível com fanzine_builder.py."""
    return upload_pdf_to_drive(path, credentials)


def run_micro_jornal_pipeline() -> None:
    """Executa o notebook/pipeline Colab preservado em notebook_pipeline.py."""
    pipeline_path = Path(__file__).with_name("notebook_pipeline.py")
    if not pipeline_path.exists():
        raise FileNotFoundError(f"Pipeline não encontrado: {pipeline_path}")
    runpy.run_path(str(pipeline_path), run_name="__main__")


def main() -> int:
    """Exemplo local simples do gerador de fanzines."""
    print(f"Gerador de Fanzines - {PROJECT_NAME}")
    print(f"{'=' * 60}\n")

    logo_bytes = None
    if os.environ.get("USE_DRIVE_LOGO", "").strip().lower() in {"1", "true", "yes", "sim", "on"}:
        credentials = authenticate_google()
        logo_bytes = download_logo_from_drive(credentials)
        if not logo_bytes:
            print(f"Aviso: logo {LOGO_FILENAME} não encontrado no Drive.")

    output_path = OUTPUT_DIR / "exemplo_fanzine.pdf"
    pdf_path = create_fanzine_pdf(
        output_path=output_path,
        title="A Aventura no Parque",
        body_text=(
            "Era uma vez uma menina chamada Ana, que adorava explorar o parque perto de sua casa. "
            "Um dia, ela encontrou um livro mágico embaixo de uma grande árvore.\n\n"
            "O livro tinha páginas brilhantes e, quando Ana o abriu, descobriu que poderia viajar "
            "para mundos fantásticos apenas lendo as histórias."
        ),
        author="Ana Silva - EC 115 Norte",
        ods_list=[
            "ODS 4 - Educação de Qualidade",
            "ODS 11 - Cidades e Comunidades Sustentáveis",
            "ODS 15 - Vida Terrestre",
        ],
        logo_bytes=logo_bytes,
    )
    validate_pdf_visually(pdf_path)
    print("\nProcesso concluído!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
