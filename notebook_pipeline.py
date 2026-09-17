# %%
# ==============================================================================
# MICRO-JORNAIS LUDOSÓFICOS — geração de PDF dobrável com ilustrações em LoRA
# ------------------------------------------------------------------------------
# Mescla o pipeline de diagramação/ODS/PDF (antes em base.py) com o motor de
# imagem avançado deste notebook: SDXL + LoRA + reescrita de cena via Gemini +
# pós-processamento "página de colorir" (contornos suaves, olhos pretos,
# interiores em branco). Cada conto vira um fanzine A4 dobrável com 2
# ilustrações complementares: capa e última página. A contra-capa prioriza ODS.
# ==============================================================================
#
# CONFIGURAÇÃO DO MODELO DE IMAGEM — SDXL base + LoRA LineAniRedmond (Linear Manga V2)
# ------------------------------------------------------------------------------
# Este notebook usa o LoRA de estilo "line art / mangá linear":
#   artificialguybr/LineAniRedmond-LinearMangaSDXL-V2
# que é um ADAPTADOR (LoRA), e NÃO um checkpoint completo. Ele é aplicado sobre o
# modelo-base oficial:
#   stabilityai/stable-diffusion-xl-base-1.0
# carregado via from_pretrained() (repositório Diffusers completo), com o LoRA
# carregado por cima via load_lora_weights().
#
# Palavra-gatilho (trigger) do LoRA: "LineAniAF" (combine com "lineart").
# Arquivo de pesos do LoRA: LineAniRedmondV2-Lineart-LineAniAF.safetensors
#
# Otimizações para Colab T4 (~15GB):
# - fp16 + enable_model_cpu_offload() (config canônica de SDXL no T4)
# - Attention slicing / VAE slicing / VAE tiling para economia de memória
#
# Quantização 8-bit (bitsandbytes) continua disponível, mas DESLIGADA por padrão
# para este LoRA; em T4 o caminho fp16+offload é mais estável. Para reativar:
#   os.environ["USE_8BIT_QUANTIZATION"] = "1"
#
# Para trocar o modelo/LoRA via ambiente:
#   os.environ["IMAGE_MODEL_ID"]        = "stabilityai/stable-diffusion-xl-base-1.0"
#   os.environ["STYLE_LORA_REPO"]       = "artificialguybr/LineAniRedmond-LinearMangaSDXL-V2"
#   os.environ["STYLE_LORA_WEIGHT_NAME"]= "LineAniRedmondV2-Lineart-LineAniAF.safetensors"
#   os.environ["STYLE_LORA_TRIGGER"]    = "LineAniAF, lineart"
#
# ==============================================================================

# ==============================================================================
# 1. INSTALAÇÃO DE DEPENDÊNCIAS
# ==============================================================================
import getpass
import gc
import glob
import importlib.metadata as importlib_metadata
import io
import logging
import os
import re
import shutil
import subprocess
import sys
import textwrap
import time
import unicodedata
import urllib.request
import warnings
from html import escape
from pathlib import Path
from typing import Optional


logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("micro_jornal")
logging.getLogger("torchao").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message=".*Flax classes are deprecated.*")
warnings.filterwarnings("ignore", message=".*Siglip2ImageProcessorFast.*")


def _version_tuple(version: str) -> tuple:
    parts = re.findall(r"\d+|[a-zA-Z]+", str(version).split("+", 1)[0])
    normalized = []
    for part in parts:
        normalized.append((0, int(part)) if part.isdigit() else (1, part.lower()))
    return tuple(normalized)


def _is_version_below(current: str, minimum: str) -> bool:
    return _version_tuple(current) < _version_tuple(minimum)


def installed_version(distribution_name: str) -> str | None:
    try:
        return importlib_metadata.version(distribution_name)
    except importlib_metadata.PackageNotFoundError:
        return None


def ensure_package(
    import_name: str,
    pip_name: str | None = None,
    min_version: str | None = None,
    force_reinstall: bool | None = None,
) -> None:
    """Instala somente quando o pacote falta ou está abaixo da versão mínima."""
    package = pip_name or import_name
    force = force_reinstall if force_reinstall is not None else os.environ.get("FORCE_REINSTALL", "0") == "1"
    current = installed_version(package)
    needs_install = force or current is None or (min_version and _is_version_below(current, min_version))

    if needs_install:
        target = f"{package}>={min_version}" if min_version and not force else package
        logger.info("Instalando %s%s", target, " (force reinstall)" if force else "")
        cmd = [sys.executable, "-m", "pip", "install", "-q"]
        if force:
            cmd.append("--force-reinstall")
        cmd.append(target)
        subprocess.check_call(cmd)

    try:
        __import__(import_name)
    except ImportError:
        logger.exception("Falha ao importar %s depois da instalação de %s.", import_name, package)
        raise


def check_runtime_compatibility(strict: bool = False) -> None:
    """Mostra incompatibilidades cedo, antes de downloads longos ou OOM obscuro."""
    required = {
        "torch": "2.1.0",
        "accelerate": "0.28.0",
        "diffusers": "0.30.0",
        "safetensors": "0.4.3",
        "transformers": "4.40.0",
    }
    problems = []
    for package, minimum in required.items():
        current = installed_version(package)
        if current is None:
            problems.append(f"{package} não está instalado; instale {package}>={minimum}.")
        elif _is_version_below(current, minimum):
            problems.append(f"{package}=={current} está abaixo de {minimum}.")

    torch_v = installed_version("torch")
    accelerate_v = installed_version("accelerate")
    diffusers_v = installed_version("diffusers")
    safetensors_v = installed_version("safetensors")
    if torch_v and accelerate_v and not _is_version_below(torch_v, "2.1.0") and _is_version_below(accelerate_v, "0.28.0"):
        problems.append("accelerate antigo com torch recente pode quebrar offload, FSDP ou device mesh.")
    if diffusers_v and safetensors_v and not _is_version_below(diffusers_v, "0.30.0") and _is_version_below(safetensors_v, "0.4.3"):
        problems.append("diffusers recente precisa de safetensors atualizado para carregar checkpoints com segurança.")

    if problems:
        message = (
            "Compatibilidade de bibliotecas precisa de atenção:\n- "
            + "\n- ".join(problems)
            + "\nSugestão: reinicie o runtime após a instalação automática ou ajuste as versões no bloco de dependências."
        )
        if strict:
            raise RuntimeError(message)
        logger.warning(message)


ensure_package("PIL", "Pillow", "10.0.0")
ensure_package("numpy", "numpy", "1.24.0")
ensure_package("google.genai", "google-genai")
ensure_package("googleapiclient", "google-api-python-client")
# O diffusers/peft atual valida torchao ao carregar LoRA; Colab pode vir com versão antiga.
ensure_package("torchao", "torchao", "0.16.0")
ensure_package("diffusers", "diffusers", "0.30.0")
ensure_package("transformers", "transformers", "4.40.0")
ensure_package("accelerate", "accelerate", "0.28.0")
ensure_package("safetensors", "safetensors", "0.4.3")
# peft é o backend usado por diffusers para load_lora_weights/set_adapters (LoRA LineAniRedmond).
ensure_package("peft", "peft", "0.11.0")
ensure_package("reportlab", "reportlab", "4.0.0")
ensure_package("gdown", "gdown")
ensure_package("bitsandbytes", "bitsandbytes", "0.41.0")

import gdown
import numpy as np
import torch
from google import genai
from google.genai import types
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from PIL import Image, ImageFilter, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4, A5, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Frame, Paragraph

try:
    from diffusers import AutoPipelineForText2Image, StableDiffusionXLPipeline
except ImportError:
    ensure_package("diffusers", "diffusers", "0.30.0")
    from diffusers import AutoPipelineForText2Image, StableDiffusionXLPipeline

try:
    from google.colab import auth, files, userdata
except ImportError:
    auth = None
    files = None
    userdata = None

logging.getLogger("google_auth_httplib2").setLevel(logging.ERROR)
check_runtime_compatibility(strict=os.environ.get("STRICT_COMPATIBILITY", "0") == "1")


# ==============================================================================
# 2. CONFIGURAÇÃO
# ==============================================================================
# --- Google Drive (entrada de contos .txt e saída de PDFs) --------------------
# Variáveis de processo/Colab. Os valores antigos permanecem como fallback
# para não interromper os notebooks já publicados.
PLANILHA_DAS_DIRETRIZES_ID = "1ZSoGO2JS8fX7KdCnyDZkB2uQ7Hh1EqvuYRCIVDINg2U"
DEFAULT_STORY_FOLDER_ID = "1G8NollXbSDyEsI1A-cx4FKczPDtVtMEU"
Input_Folder = os.environ.get(
    "INPUT_FOLDER_ID", os.environ.get("FOLDER_ID", DEFAULT_STORY_FOLDER_ID)
).strip()
Output_Folder = os.environ.get(
    "OUTPUT_FOLDER_ID", os.environ.get("FOLDER_ID", Input_Folder)
).strip()
# Pasta independente, contendo os 17 PNGs diretamente na raiz.
# Sem ela, o pipeline usa os ícones públicos como fallback.
ODS_FOLDER_ID = os.environ.get("ODS_FOLDER_ID", "").strip()

INPUT_FOLDER_ID = Input_Folder
OUTPUT_FOLDER_ID = Output_Folder

# Mantém os nomes usados pelo restante do notebook.
PASTA_ORIGEM_ID = INPUT_FOLDER_ID
PASTA_DESTINO_ID = OUTPUT_FOLDER_ID

contos_dir = "/content/contos"
saida_dir = "/content/saida_pdfs"
ods_dir = "/content/ods_emblemas"
img_dir = "/content/ilustracoes"
for _d in (contos_dir, saida_dir, ods_dir, img_dir):
    os.makedirs(_d, exist_ok=True)


# --- Gerador A5 autônomo (migrado de fanzine_builder/notebook_editor) ---------
FANZINE_PAGE_WIDTH, FANZINE_PAGE_HEIGHT = A5
FANZINE_MARGIN_LEFT = 0.7 * cm
FANZINE_MARGIN_RIGHT = 0.3 * cm
FANZINE_MARGIN_TOP = 1.5 * cm
FANZINE_MARGIN_BOTTOM = 1.5 * cm
FANZINE_TEXT_WIDTH = FANZINE_PAGE_WIDTH - FANZINE_MARGIN_LEFT - FANZINE_MARGIN_RIGHT
FANZINE_TEXT_HEIGHT = FANZINE_PAGE_HEIGHT - FANZINE_MARGIN_TOP - FANZINE_MARGIN_BOTTOM
FANZINE_LOGO_SIZE = 0.8 * cm
LOGO_FILENAME = "plantao_escolar.png"
LOGO_FILE_ID = os.environ.get("LOGO_FILE_ID", "1NnJ8lj3Sm6YBS4sIfvbHZPPIpJZ3UxQB").strip()
LOGO_DRIVE_URL = os.environ.get(
    "LOGO_DRIVE_URL",
    f"https://drive.google.com/file/d/{LOGO_FILE_ID}/view?usp=sharing" if LOGO_FILE_ID else "",
).strip()
FANZINE_COLOR_PRIMARY = HexColor("#1a73e8")
FANZINE_COLOR_TEXT = HexColor("#202124")
FANZINE_COLOR_LIGHT = HexColor("#5f6368")
PROJECT_NAME = "Tool Debate - Um conto por aluno"
FANZINE_OUTPUT_DIR = Path(os.environ.get("PDF_OUTPUT_DIR", "/tmp/fanzines"))
FOLDER_ENV_KEYS = ("FOLDER_ID", "OUTPUT_FOLDER_ID", "DRIVE_FOLDER_ID")
LOGO_SOURCE_ENV_KEYS = ("LOGO_FILE_ID", "LOGO_DRIVE_FILE_ID", "LOGO_DRIVE_URL")
FANZINE_BODY_FONT_SIZE = 10
FANZINE_BODY_LEADING = 13
FANZINE_BODY_FIRST_LINE_INDENT = 0.35 * cm
FANZINE_BODY_PARAGRAPH_SPACE_AFTER = 0.12 * cm


def _read_secret(name: str) -> Optional[str]:
    """Lê valor de Colab Secrets quando disponível."""
    if userdata is None:
        return None
    try:
        value = userdata.get(name)
        return value.strip() if isinstance(value, str) and value.strip() else None
    except Exception:
        return None


def get_config_value(keys: tuple[str, ...], required: bool = True) -> Optional[str]:
    """Lê configuração do ambiente primeiro, depois dos Secrets do Colab."""
    for key in keys:
        value = os.environ.get(key)
        if value and value.strip():
            return value.strip()
    for key in keys:
        value = _read_secret(key)
        if value:
            return value
    if required:
        raise RuntimeError(f"Configure uma destas variáveis antes de executar: {', '.join(keys)}")
    return None


def authenticate_google():
    """Autentica no Colab ou reutiliza Application Default Credentials."""
    if auth is not None:
        try:
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
    for pattern in (r"/file/d/([a-zA-Z0-9_-]+)", r"[?&]id=([a-zA-Z0-9_-]+)", r"/d/([a-zA-Z0-9_-]+)"):
        match = re.search(pattern, value)
        if match:
            return match.group(1)
    return value


def _drive_query_string_literal(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def download_file_from_drive(file_id_or_name: str, credentials) -> Optional[bytes]:
    """Baixa arquivo do Drive por ID/link ou procura por nome dentro de FOLDER_ID."""
    try:
        service = build("drive", "v3", credentials=credentials)
        source = (file_id_or_name or "").strip()
        file_id = extract_drive_file_id(source)

        if file_id == source and not source.startswith("http") and len(source) < 50 and "." in source:
            folder_id = get_config_value(FOLDER_ENV_KEYS, required=False)
            if folder_id:
                query = (
                    f"name='{_drive_query_string_literal(source)}' and "
                    f"'{_drive_query_string_literal(folder_id)}' in parents and trashed=false"
                )
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
                files_found = results.get("files", [])
                if files_found:
                    file_id = files_found[0]["id"]
                    print(f"Arquivo encontrado: {files_found[0]['name']} (ID: {file_id})")

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
    """Cria a capa do fanzine A5."""
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(FANZINE_COLOR_PRIMARY)
    title_lines = wrap_text(title, FANZINE_TEXT_WIDTH, "Helvetica-Bold", 18)
    y_pos = FANZINE_PAGE_HEIGHT / 2 + 2 * cm
    for line in title_lines:
        text_width = c.stringWidth(line, "Helvetica-Bold", 18)
        c.drawString((FANZINE_PAGE_WIDTH - text_width) / 2, y_pos, line)
        y_pos -= 0.7 * cm
    if author:
        c.setFont("Helvetica", 12)
        c.setFillColor(FANZINE_COLOR_LIGHT)
        y_pos -= 0.5 * cm
        text_width = c.stringWidth(author, "Helvetica", 12)
        c.drawString((FANZINE_PAGE_WIDTH - text_width) / 2, y_pos, author)
    c.showPage()


def create_back_cover(c: canvas.Canvas, logo_bytes: Optional[bytes], ods_list: list[str]) -> None:
    """Cria a contracapa A5 com logo centralizado e até 3 ODS abaixo."""
    logo_x = (FANZINE_PAGE_WIDTH - FANZINE_LOGO_SIZE) / 2
    logo_y = FANZINE_PAGE_HEIGHT - FANZINE_MARGIN_TOP - FANZINE_LOGO_SIZE - 2 * cm
    if logo_bytes:
        try:
            c.drawImage(
                ImageReader(io.BytesIO(logo_bytes)),
                logo_x,
                logo_y,
                width=FANZINE_LOGO_SIZE,
                height=FANZINE_LOGO_SIZE,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception as exc:
            print(f"Erro ao adicionar logo: {exc}")
            c.setStrokeColor(FANZINE_COLOR_LIGHT)
            c.setLineWidth(1)
            c.rect(logo_x, logo_y, FANZINE_LOGO_SIZE, FANZINE_LOGO_SIZE)

    ods_y = logo_y - 1.5 * cm
    ods_display = ods_list[:3]
    if ods_display:
        title_text = "ODS relacionados:"
        title_width = c.stringWidth(title_text, "Helvetica-Bold", 10)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(FANZINE_COLOR_TEXT)
        c.drawString((FANZINE_PAGE_WIDTH - title_width) / 2, ods_y, title_text)
        ods_y -= 0.6 * cm
        c.setFont("Helvetica", 9)
        for ods in ods_display:
            ods_text = f"- {ods}"
            text_width = c.stringWidth(ods_text, "Helvetica", 9)
            c.drawString((FANZINE_PAGE_WIDTH - text_width) / 2, ods_y, ods_text)
            ods_y -= 0.5 * cm

    c.setFont("Helvetica", 8)
    c.setFillColor(FANZINE_COLOR_LIGHT)
    footer_width = c.stringWidth(PROJECT_NAME, "Helvetica", 8)
    c.drawString((FANZINE_PAGE_WIDTH - footer_width) / 2, FANZINE_MARGIN_BOTTOM, PROJECT_NAME)
    c.showPage()


def create_text_page(c: canvas.Canvas, text: str, page_num: int = 1) -> None:
    """Cria uma ou mais páginas A5 do corpo do conto, justificado."""
    body_style = ParagraphStyle(
        "FanzineBody",
        fontName="Helvetica",
        fontSize=FANZINE_BODY_FONT_SIZE,
        leading=FANZINE_BODY_LEADING,
        textColor=FANZINE_COLOR_TEXT,
        alignment=TA_JUSTIFY,
        firstLineIndent=FANZINE_BODY_FIRST_LINE_INDENT,
        spaceBefore=0,
        spaceAfter=FANZINE_BODY_PARAGRAPH_SPACE_AFTER,
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
            FANZINE_MARGIN_LEFT,
            FANZINE_MARGIN_BOTTOM,
            FANZINE_TEXT_WIDTH,
            FANZINE_TEXT_HEIGHT,
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
            available_height = max(0, frame._y - frame._y1p)
            split_flowables = flowable.split(frame._aW, available_height)
            if split_flowables and frame.add(split_flowables[0], c):
                story = split_flowables[1:] + story[1:]
            break
        _draw_fanzine_page_number(c, page_num)
        c.showPage()
        page_num += 1
        if len(story) == page_started_with:
            raise RuntimeError("Não foi possível diagramar um parágrafo do conto no espaço disponível.")


def _draw_fanzine_page_number(c: canvas.Canvas, page_num: int) -> None:
    c.setFont("Helvetica", 8)
    c.setFillColor(FANZINE_COLOR_LIGHT)
    page_text = str(page_num)
    page_width = c.stringWidth(page_text, "Helvetica", 8)
    c.drawString((FANZINE_PAGE_WIDTH - page_width) / 2, FANZINE_MARGIN_BOTTOM / 2, page_text)


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
    FANZINE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output_path), pagesize=A5)
    c.setTitle(title)
    if author:
        c.setAuthor(author)
    c.setCreator("notebook_pipeline.py")
    create_cover_page(c, title, author)
    create_text_page(c, body_text)
    create_back_cover(c, logo_bytes, ods_list or [])
    c.save()
    print(f"Fanzine criado: {output_path}")
    return output_path


def validate_pdf_visually(pdf_path: Path) -> bool:
    """Valida visualmente o PDF gerado exibindo informações básicas."""
    try:
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            ensure_package("pypdf", "pypdf")
            from pypdf import PdfReader  # type: ignore

        pdf_path = Path(pdf_path)
        reader = PdfReader(str(pdf_path))
        print(f"\n{'=' * 60}")
        print(f"Validação Visual do PDF: {pdf_path.name}")
        print(f"{'=' * 60}")
        print(f"Número de páginas: {len(reader.pages)}")
        print(f"Tamanho do arquivo: {pdf_path.stat().st_size / 1024:.2f} KB")
        mediabox = reader.pages[0].mediabox
        width_cm = float(mediabox.width) / 72 * 2.54
        height_cm = float(mediabox.height) / 72 * 2.54
        print(f"Dimensões da página: {width_cm:.2f} cm x {height_cm:.2f} cm")
        print("Formato esperado (A5): 14.8 cm x 21.0 cm")
        print("Logo na contracapa: 0.8 cm x 0.8 cm, centralizado")
        print(f"{'=' * 60}\n")
        return True
    except Exception as exc:
        print(f"Erro na validação: {exc}")
        return False


def upload_fanzine_pdf_to_drive(path: Path, credentials) -> Optional[dict]:
    """Envia um PDF A5 para a pasta configurada em FOLDER_ID."""
    folder_id = get_config_value(FOLDER_ENV_KEYS, required=False)
    if not folder_id:
        print("FOLDER_ID não configurado; mantendo apenas cópia local do PDF.")
        return None
    try:
        path = Path(path)
        service = build("drive", "v3", credentials=credentials)
        media = MediaFileUpload(str(path), mimetype="application/pdf", resumable=True)
        created = (
            service.files()
            .create(
                body={"name": path.name, "parents": [folder_id]},
                media_body=media,
                fields="id, webViewLink",
                supportsAllDrives=True,
            )
            .execute()
        )
        print(f"PDF enviado ao Drive: {created.get('webViewLink') or created.get('id')}")
        return created
    except Exception as exc:
        print(f"Aviso: falha ao enviar {path.name} para FOLDER_ID ({exc}).")
        return None


# --- Motor de texto (Gemini) e de imagem (SDXL + LoRA) ------------------------
def env_flag(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip().lower() in {"1", "true", "yes", "sim", "on"}


def optional_int_env(name: str) -> int | None:
    value = os.environ.get(name, "").strip()
    return int(value) if value else None


def cuda_total_memory_gb() -> float:
    if not torch.cuda.is_available():
        return 0.0
    return torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)


def resolve_image_model_id() -> str:
    configured = os.environ.get("IMAGE_MODEL_ID", "").strip()
    if configured:
        return configured
    # Base SDXL oficial sobre a qual o LoRA LineAniRedmond (Linear Manga V2) é aplicado.
    return "stabilityai/stable-diffusion-xl-base-1.0"


def resolve_text_model_name() -> str:
    model = os.environ.get("GEMINI_MODEL", "").strip()
    if not model and userdata is not None:
        try:
            model = (userdata.get("GEMINI_MODEL") or "").strip()
        except Exception:
            model = ""
    if model.startswith("models/"):
        model = model[len("models/"):]
    return model or "gemini-2.5-flash"


# Controle de quantização 8-bit. Desligado por padrão: com SDXL base + LoRA em T4,
# o caminho fp16 + model_cpu_offload é mais estável que a quantização via bitsandbytes.
USE_8BIT_QUANTIZATION = env_flag("USE_8BIT_QUANTIZATION", "0")


TEXT_MODEL_NAME = resolve_text_model_name()
TEXT_TEMPERATURE = float(os.environ.get("TEXT_TEMPERATURE", "0.45"))
PREVIEW_MODE = env_flag("PREVIEW_MODE") or env_flag("PREVIEW")
# Base SDXL (from_pretrained) + LoRA LineAniRedmond para o estilo de line art / mangá linear.
IMAGE_MODEL_ID = resolve_image_model_id()
IS_TURBO_MODEL = "turbo" in IMAGE_MODEL_ID.lower()
# As imagens não são quadradas no PDF; gerar já na proporção economiza GPU e evita cortes ruins.
ASPECT_RATIO = "capa 10:9; última página 2:1"
COVER_IMAGE_WIDTH = int(os.environ.get("COVER_IMAGE_WIDTH", 512 if PREVIEW_MODE else 640))
COVER_IMAGE_HEIGHT = int(os.environ.get("COVER_IMAGE_HEIGHT", 512 if PREVIEW_MODE else 576))
PAGE6_IMAGE_WIDTH = int(os.environ.get("PAGE6_IMAGE_WIDTH", 512 if PREVIEW_MODE else 640))
PAGE6_IMAGE_HEIGHT = int(os.environ.get("PAGE6_IMAGE_HEIGHT", 256 if PREVIEW_MODE else 320))
IMAGE_WIDTH = COVER_IMAGE_WIDTH
IMAGE_HEIGHT = COVER_IMAGE_HEIGHT
# SDXL base + LoRA pede mais passos e guidance maior que o antigo modelo rectified-flow.
DEFAULT_STEPS = 4 if IS_TURBO_MODEL else 30
DEFAULT_GUIDANCE = 0.0 if IS_TURBO_MODEL else 7.0
IMAGE_NUM_INFERENCE_STEPS = int(os.environ.get("IMAGE_STEPS", 4 if PREVIEW_MODE else DEFAULT_STEPS))
IMAGE_GUIDANCE_SCALE = float(os.environ.get("IMAGE_GUIDANCE", DEFAULT_GUIDANCE))
# Sem IMAGE_SEED, as imagens variam a cada execução; defina IMAGE_SEED para reproduzir.
IMAGE_SEED = optional_int_env("IMAGE_SEED")
USE_GEMINI_TEXT_REWRITE = True
USE_MODEL_CPU_OFFLOAD = True
MAX_IMAGE_PROMPT_WORDS = 46
MAX_SCENE_PROMPT_WORDS = 14
ILLUSTRATIONS_PER_STORY = max(1, min(2, int(os.environ.get("ILLUSTRATIONS_PER_STORY", "2"))))
OUTDOOR_NATURE_BIAS = env_flag("OUTDOOR_NATURE_BIAS", "1")
COLORING_LORA_REPO = os.environ.get("COLORING_LORA_REPO", "").strip()
COLORING_LORA_WEIGHT_NAME = os.environ.get("COLORING_LORA_WEIGHT_NAME", "").strip()
COLORING_LORA_TRIGGER = os.environ.get("COLORING_LORA_TRIGGER", "coloring book lineart").strip()
COLORING_LORA_SCALE = float(os.environ.get("COLORING_LORA_SCALE", "0.75"))
MAX_IMAGE_RETRIES = max(1, int(os.environ.get("MAX_IMAGE_RETRIES", "2")))
MICRO_JORNAL_NAME = ""
MICRO_JORNAL_SUBTITLE = ""
PANEL_HEADER_RESERVE = 0.16 * cm

# --- LoRA de estilo principal: LineAniRedmond (Linear Manga SDXL V2) ----------
# Adaptador de "line art / mangá linear" aplicado sobre a base SDXL. Para desativar,
# defina STYLE_LORA_REPO="" no ambiente.
STYLE_LORA_REPO = os.environ.get(
    "STYLE_LORA_REPO", "artificialguybr/LineAniRedmond-LinearMangaSDXL-V2"
).strip()
STYLE_LORA_WEIGHT_NAME = os.environ.get(
    "STYLE_LORA_WEIGHT_NAME", "LineAniRedmondV2-Lineart-LineAniAF.safetensors"
).strip()
STYLE_LORA_TRIGGER = os.environ.get("STYLE_LORA_TRIGGER", "LineAniAF, lineart").strip()
STYLE_LORA_SCALE = float(os.environ.get("STYLE_LORA_SCALE", "1.0"))

# LoRA(s) de estilo. Ordem: estilo (LineAniRedmond) e, opcionalmente, um LoRA extra de
# colorir definido por COLORING_LORA_REPO (repo HF ou caminho local/Drive).
# Exemplo de env no Colab antes de rodar a célula:
#   os.environ["COLORING_LORA_REPO"] = "/content/drive/MyDrive/modelos/coloring_lora"
#   os.environ["COLORING_LORA_WEIGHT_NAME"] = "arquivo.safetensors"  # opcional
IMAGE_LORAS: list = []
if STYLE_LORA_REPO:
    style_cfg = {"path": STYLE_LORA_REPO, "adapter_name": "lineani_style", "weight": STYLE_LORA_SCALE}
    if STYLE_LORA_WEIGHT_NAME:
        style_cfg["weight_name"] = STYLE_LORA_WEIGHT_NAME
    IMAGE_LORAS.append(style_cfg)
if COLORING_LORA_REPO:
    lora_cfg = {"path": COLORING_LORA_REPO, "adapter_name": "coloring_lineart", "weight": COLORING_LORA_SCALE}
    if COLORING_LORA_WEIGHT_NAME:
        lora_cfg["weight_name"] = COLORING_LORA_WEIGHT_NAME
    IMAGE_LORAS.append(lora_cfg)

# Gatilhos (trigger words) dos LoRAs ativos, na ordem de carregamento.
LORA_TRIGGERS = ", ".join(
    trigger
    for trigger in (
        STYLE_LORA_TRIGGER if STYLE_LORA_REPO else "",
        COLORING_LORA_TRIGGER if COLORING_LORA_REPO else "",
    )
    if trigger
)

# --- Modo "página de colorir" -------------------------------------------------
# Converte a imagem gerada em um delineamento suave para a criança pintar por cima:
# contornos finos em cinza médio (vazados), APENAS os olhos preenchidos de preto
# e todo o restante em branco (sem cor), pronto para a criança colorir como quiser.
COLORING_BOOK_MODE = True
# Tom das linhas de contorno (0 = preto, 255 = branco). "Cinza médio" ~ 130-160.
COLORING_LINE_GRAY = 145
# Qualquer pixel mais escuro que isto conta como traço (0..1 da intensidade de "tinta").
COLORING_INK_THRESHOLD = 0.42
# Para virar preenchimento PRETO o pixel precisa ser quase preto (0..1).
COLORING_SOLID_THRESHOLD = 0.68
# Iterações da "abertura" morfológica que separam manchas grossas (olhos) de
# linhas finas. Aumente se contornos grossos virarem preto; diminua se olhos sumirem.
COLORING_OPEN_ITERS = 4
# Suavização final aplicada só às linhas, para um delineamento "macio" (0 = desliga).
COLORING_SOFT_BLUR_RADIUS = 0.45


STYLE_SYSTEM = """
Você é um diretor de arte editorial para micro-jornais de sala de aula e páginas de
colorir para crianças dos anos iniciais do ensino fundamental: ilustração 2D
infantil, singela, meiga e delicada, desenhada APENAS como contorno (line art)
para colorização manual.
Reescreva prompts quando solicitado.

Heurísticas visuais prioritárias para a estética desejada:
- composição de vinheta editorial infantil, clara como imagem de jornal escolar
- no máximo 1 ou 2 figuras principais, com cenário simples mas reconhecível
- variar ambientes entre histórias: parque, horta escolar, pátio arborizado, praça,
  trilha do cerrado, margem de rio/lagoa, jardim comunitário, campo aberto
- evitar monotonia de interiores, corredores, salas, fachadas de vidro e edificações modernas
- desenho de contorno limpo: pouquíssimas linhas finas, sem cores e sem preenchimentos
- formas insinuadas por ausência: contornos abertos, linhas interrompidas e espaços vazios
- criança pequena em pé: proporções infantis suaves, cabeça um pouco maior, corpo simples e acolhedor
- expressão doce e curiosa: olhos redondos pretos, sorriso pequeno, postura calma e gentil
- mãos muito simples: pequenas luvas/ovais ou só indicação do punho, sem dedos definidos
- interiores vazios (vazados, em branco), prontos para colorir com lápis ou caneta
- APENAS os olhos de pessoas e animais ficam preenchidos de preto sólido; nada mais é preto
- personagens com detalhes mínimos: cabelo simples, rosto meigo, tronco sugerido, poucos traços de roupa, sem textura
- objetos e cenário são propositalmente simplificados: 1 a 3 elementos grandes, só sugeridos
- nada de padrões pequenos, texturas, excesso de folhas, fios, tijolos ou detalhes repetidos
- fundo quase vazio e muito espaço branco para a criança completar se quiser
- linhas leves, delicadas e bem separadas, como arte-final mínima para micro-jornal
- sem sombra, sem hachura, sem textura, sem luz realista
- aparência infantil respeitosa: doce e escolar, sem aparência adolescente, sem traços de bebê

Regras obrigatórias:
- single shot only
- página de colorir: apenas contornos (line art), sem cores, sem sombreado, sem hachura
- somente os olhos em preto sólido; todo o restante vazado (só contorno), pronto para colorir
- personagens essenciais; objetos e cenário natural minimalistas, com pouquíssimos traços (Gestalt)
- prefira insinuação de forma a desenho completo: contorno parcial, mãos simplificadas, sem dedos
- no text, no captions, no subtitles, no watermark, no logo
- sem split screen, sem colagem, sem grid
- imagem final em desenho 2D singelo, simples, meigo e não realista
""".strip()


LOCAL_STYLE_PROMPT = """
black white manga lineart, coloring page, clean contours,
open white areas, simple hands, no text
""".strip()

ROLE_STYLE_PROMPTS = {
    "cover": "cover, single outdoor scene, clear silhouette",
    "page6": "wide calm outdoor scene, balanced empty space",
}


NEGATIVE_PROMPT = """
color, shading, hatching, texture, text, watermark, logo, photorealistic, 3d,
duplicate, repeated character, double face, extra head, extra limbs, collage,
split screen, panels, meme, chaotic, deformed, brainrot, messy, cropped face,
crowded background, many objects, intricate details, heavy lines, thick outlines,
detailed fingers, realistic hands, teenager, adolescent, adult-like face,
fashion pose, mature body, makeup, chibi, solid fills, stray marks,
modern architecture, futuristic building, glass facade, atrium, office, hallway,
indoor room, luxury interior, empty modern room, architectural render
""".strip()


# Cenas usadas quando o Gemini está desativado/indisponível:
# 1) capa: síntese/convite; 2) última página: fechamento/complemento.
CENAS_PADRAO = [
    "young child in school garden under native tree, sweet face, simple hands",
    "young child on cerrado trail observing seedlings, gentle smile",
]


SCENE_ENVIRONMENT_PROMPTS = [
    "school garden, native tree, path",
    "cerrado park, curved trail",
    "community garden, seedlings",
    "neighborhood square, tree bench",
    "riverbank path, reeds",
    "open schoolyard, shade tree",
    "field edge, trees",
    "small pond, plants",
]

NATURE_CONTEXT_KEYWORDS = {
    "park", "garden", "schoolyard", "courtyard", "tree", "trees", "forest", "cerrado",
    "trail", "river", "stream", "lake", "pond", "seedling", "plant", "plants",
    "field", "square", "beach", "sea", "garden bed", "horta", "jardim", "parque",
    "trilha", "rio", "lago", "lagoa", "arvore", "arvores", "praca", "campo",
}


# ==============================================================================
# 3. FONTES
# ==============================================================================
# Usa Helvetica (fonte padrão do sistema) e Helvetica-Bold
# para consistência com base.py
font_name = "Helvetica"
font_name_bold = "Helvetica-Bold"


# ==============================================================================
# 4. MOTOR DE TEXTO (GEMINI) — reescrita de cenas a partir do conto
# ==============================================================================
def resolve_google_api_key() -> str:
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key and userdata is not None:
        try:
            api_key = userdata.get("GOOGLE_API_KEY")
        except Exception:
            api_key = None
    if not api_key:
        api_key = getpass.getpass("Informe sua GOOGLE_API_KEY: ").strip()
    if not api_key:
        raise ValueError("GOOGLE_API_KEY ausente. Defina a chave antes de executar a célula.")
    return api_key


def get_response_parts(response) -> list:
    parts = getattr(response, "parts", None)
    if parts:
        return list(parts)

    extracted_parts = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        extracted_parts.extend(getattr(content, "parts", []) or [])
    return extracted_parts


def extract_text(response) -> str:
    text_parts = []
    for part in get_response_parts(response):
        if getattr(part, "thought", False):
            continue
        text = getattr(part, "text", None)
        if text:
            text_parts.append(text)
    return "\n".join(text_parts).strip()


def clean_prompt_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value.replace("\n", " ")).strip()
    return value.strip(" -")


def limit_words(value: str, max_words: int) -> str:
    words = clean_prompt_text(value).split()
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words]).rstrip(" ,.;:")


def prompt_keyword_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", clean_prompt_text(value).lower())
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", normalized).strip()


def scene_mentions_nature(scene_prompt: str) -> bool:
    normalized = f" {prompt_keyword_text(scene_prompt)} "
    return any(f" {keyword} " in normalized for keyword in NATURE_CONTEXT_KEYWORDS)


def environment_prompt_for_scene(scene_prompt: str, role: str, scene_index: int) -> str:
    if not OUTDOOR_NATURE_BIAS:
        return ""
    if scene_mentions_nature(scene_prompt):
        return ""
    offset = 0 if role == "cover" else len(SCENE_ENVIRONMENT_PROMPTS) // 2
    return SCENE_ENVIRONMENT_PROMPTS[(int(scene_index) + offset) % len(SCENE_ENVIRONMENT_PROMPTS)]


def build_prompt(scene_prompt: str, role: str = "cover", scene_index: int = 0) -> str:
    scene = limit_words(clean_prompt_text(scene_prompt), MAX_SCENE_PROMPT_WORDS)
    role_style = ROLE_STYLE_PROMPTS.get(role, "")
    environment = environment_prompt_for_scene(scene, role, scene_index)
    lora_trigger = LORA_TRIGGERS if IMAGE_LORAS else ""
    prompt = f"{lora_trigger}, {scene}, {environment}, {role_style}, {LOCAL_STYLE_PROMPT}".strip().strip(",").strip()
    return limit_words(prompt, MAX_IMAGE_PROMPT_WORDS)


def image_dimensions_for_role(role: str) -> tuple[int, int]:
    if role == "page6":
        return PAGE6_IMAGE_WIDTH, PAGE6_IMAGE_HEIGHT
    return COVER_IMAGE_WIDTH, COVER_IMAGE_HEIGHT


def preparar_cenas_para_geracao(cenas: list[str]) -> list[str]:
    cenas = (cenas + CENAS_PADRAO)[:2]
    if ILLUSTRATIONS_PER_STORY == 1:
        return [cenas[0], cenas[0]]
    return cenas[:2]


def gerar_cenas_do_conto(text_client, titulo: str, texto: str) -> list[str]:
    """Pede ao Gemini 2 cenas complementares extraídas do conto.

    Devolve 2 prompts de cena (em inglês, sem cores): capa e última página.
    Sem Gemini ou em caso de falha, retorna CENAS_PADRAO.
    """
    if not USE_GEMINI_TEXT_REWRITE or text_client is None or not TEXT_MODEL_NAME:
        return list(CENAS_PADRAO)

    pedido = f"""
{STYLE_SYSTEM}

Leia o conto infantil abaixo e proponha EXATAMENTE 2 cenas visuais complementares para
ilustrar uma revista de colorir, em inglês, uma cena por linha e sem numeração.
Cada cena: no máximo {MAX_SCENE_PROMPT_WORDS} palavras. Use substantivos e ações simples,
sem adjetivos visuais demais. Cena 1 = capa, síntese forte do conto. Cena 2 = última
página, desfecho ou reflexão complementar. Varie os ambientes: pelo menos uma das 2 cenas
deve ser externa ou natural. Use quando fizer sentido: school garden, park, cerrado trail,
riverbank, pond, community garden, tree, open schoolyard. Evite indoor, interior, corridor,
modern building, glass facade e architecture. Cenário simples: 1 a 3 elementos grandes.
Prefira "partial outline", "simplified hands" e "implied form" quando houver pessoa em pé.
NÃO mencione cores. Não explique nada; retorne somente as 2 linhas.

Título: {titulo}
Conto:
{texto}
""".strip()

    try:
        response = text_client.models.generate_content(
            model=TEXT_MODEL_NAME,
            contents=[pedido],
            config=types.GenerateContentConfig(temperature=TEXT_TEMPERATURE),
        )
        bruto = extract_text(response)
    except Exception as exc:
        print(f"  Aviso: geração de cenas com {TEXT_MODEL_NAME} falhou; usando cenas padrão. Detalhes: {exc}")
        return list(CENAS_PADRAO)

    cenas = []
    for linha in bruto.splitlines():
        limpa = re.sub(r"^\s*\d+[\).\-:]\s*", "", clean_prompt_text(linha)).strip()
        if limpa:
            cenas.append(limit_words(limpa, MAX_SCENE_PROMPT_WORDS))

    if len(cenas) < 2:
        cenas += CENAS_PADRAO[len(cenas):]
    return cenas[:2]


# ==============================================================================
# 5. MOTOR DE IMAGEM (SDXL + LoRA + PÁGINA DE COLORIR)
# ==============================================================================
def describe_torch_device() -> str:
    if not torch.cuda.is_available():
        return "CPU sem CUDA"
    return torch.cuda.get_device_name(0)


def cuda_memory_gb() -> float:
    if not torch.cuda.is_available():
        return 0.0
    props = torch.cuda.get_device_properties(0)
    return props.total_memory / (1024 ** 3)


def select_image_runtime() -> dict:
    if not torch.cuda.is_available():
        logger.warning(
            "Nenhuma GPU CUDA foi detectada. O notebook continuará em modo CPU/teste "
            "com resolução e passos reduzidos; para produção no Colab, ative GPU."
        )
        return {"device": "cpu", "dtype": torch.float32, "offload": False, "memory_gb": 0.0}

    memory_gb = cuda_memory_gb()
    # SDXL fp16 cabe no T4 (~15GB) com cpu offload; só caímos para float32 em GPUs muito pequenas.
    dtype = torch.float16 if memory_gb >= 12 else torch.float32
    offload = USE_MODEL_CPU_OFFLOAD or memory_gb < 16
    return {"device": "cuda", "dtype": dtype, "offload": offload, "memory_gb": memory_gb}


def clear_cuda_cache() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def apply_image_loras(pipe) -> None:
    adapter_names = []
    adapter_weights = []

    for index, lora in enumerate(IMAGE_LORAS, start=1):
        lora_config = {"path": lora} if isinstance(lora, str) else dict(lora)
        lora_path = lora_config["path"]
        adapter_name = lora_config.get("adapter_name", f"lora_{index}")
        load_kwargs = {}

        if lora_config.get("weight_name"):
            load_kwargs["weight_name"] = lora_config["weight_name"]

        try:
            pipe.load_lora_weights(lora_path, adapter_name=adapter_name, **load_kwargs)
            adapter_names.append(adapter_name)
            adapter_weights.append(float(lora_config.get("weight", 1.0)))
            logger.info("LoRA de colorir carregado: %s", lora_path)
        except Exception as exc:
            logger.warning("Não foi possível carregar LoRA %s: %s", lora_path, exc)

    if adapter_names and hasattr(pipe, "set_adapters"):
        pipe.set_adapters(adapter_names, adapter_weights=adapter_weights)


def enable_best_attention_backend(pipe) -> None:
    if hasattr(pipe, "enable_xformers_memory_efficient_attention"):
        try:
            pipe.enable_xformers_memory_efficient_attention()
            logger.info("Backend de atenção: xFormers.")
            return
        except Exception as exc:
            logger.info("xFormers indisponível; usando atenção nativa. Detalhes: %s", exc)
    logger.info("Backend de atenção: nativo do PyTorch/Diffusers.")


def build_image_pipeline():
    runtime = select_image_runtime()
    device = runtime["device"]
    dtype = runtime["dtype"]
    logger.info(
        "Runtime de imagem: device=%s, dtype=%s, memória CUDA=%.1f GB, offload=%s",
        device,
        dtype,
        runtime["memory_gb"],
        runtime["offload"],
    )

    # Configuração de quantização 8-bit para economia de memória (~10-11GB)
    use_8bit = USE_8BIT_QUANTIZATION and device == "cuda" and runtime["memory_gb"] >= 10
    
    # Detectar se é modelo single-file (ChenkinNoob) ou repositório Diffusers
    is_chenkin_model = "ChenkinRF/ChenkinNoob" in IMAGE_MODEL_ID or "ChenkinNoob" in IMAGE_MODEL_ID
    
    attempts = []
    
    if is_chenkin_model:
        logger.info("Detectado modelo ChenkinNoob (single-file checkpoint)")
        logger.info("Usando from_single_file() para carregar o modelo")
        
        # ChenkinNoob é um single-file checkpoint, usa from_single_file
        if use_8bit:
            logger.info("Configurando quantização 8-bit para modelo ChenkinNoob-XL")
            try:
                import bitsandbytes as bnb
                # Quantização para single-file checkpoint
                quantization_config = {
                    "load_in_8bit": True,
                    "bnb_8bit_compute_dtype": torch.bfloat16,
                    "bnb_8bit_use_double_quant": True,
                    "llm_int8_threshold": 6.0,
                }
                attempts.append({
                    "method": "single_file",
                    "torch_dtype": torch.bfloat16,
                    "use_safetensors": True,
                    "device_map": "auto",
                    "quantization_config": quantization_config,
                })
                logger.info("Quantização 8-bit configurada: uso de memória esperado ~10-11GB")
            except ImportError:
                logger.warning("bitsandbytes não disponível, tentando sem quantização")
                use_8bit = False
        
        # Tentativas sem quantização para single-file
        if not use_8bit:
            if device == "cuda" and dtype == torch.float16:
                attempts.append({"method": "single_file", "torch_dtype": torch.float16, "use_safetensors": True})
            attempts.append({"method": "single_file", "torch_dtype": dtype, "use_safetensors": True})
    else:
        # Modelo normal do Diffusers (repositório completo)
        # Primeira tentativa: quantização 8-bit (ideal para 10-11GB VRAM)
        if use_8bit:
            logger.info("Configurando quantização 8-bit para modelo SDXL")
            try:
                import bitsandbytes as bnb
                # Configuração de quantização otimizada para ~10-11GB
                quantization_config = {
                    "load_in_8bit": True,
                    "bnb_8bit_compute_dtype": torch.bfloat16,
                    "bnb_8bit_use_double_quant": True,
                    "llm_int8_threshold": 6.0,
                }
                attempts.append({
                    "method": "pretrained",
                    "torch_dtype": torch.bfloat16,
                    "use_safetensors": True,
                    "variant": "fp16",
                    "device_map": "auto",
                    "quantization_config": quantization_config,
                })
                logger.info("Quantização 8-bit configurada: uso de memória esperado ~10-11GB")
            except ImportError:
                logger.warning("bitsandbytes não disponível, tentando sem quantização")
                use_8bit = False
        
        # Tentativas alternativas sem quantização
        use_fp16_variant = "xl" in IMAGE_MODEL_ID.lower() and device == "cuda" and dtype == torch.float16
        if use_fp16_variant and not use_8bit:
            attempts.append({"method": "pretrained", "torch_dtype": torch.float16, "use_safetensors": True, "variant": "fp16"})
        
        if not use_8bit:
            attempts.append({"method": "pretrained", "torch_dtype": dtype, "use_safetensors": True})
            if dtype != torch.float32:
                attempts.append({"method": "pretrained", "torch_dtype": torch.float32, "use_safetensors": True})
            attempts.append({"method": "pretrained", "torch_dtype": torch.float32, "use_safetensors": False})

    last_exc = None
    pipe = None
    for kwargs in attempts:
        method = kwargs.pop("method")
        try:
            if method == "single_file":
                # Para single-file checkpoints (ChenkinNoob)
                pipe = StableDiffusionXLPipeline.from_single_file(IMAGE_MODEL_ID, **kwargs)
                logger.info("Pipeline carregado com from_single_file() e opções: %s", kwargs)
            else:
                # Para repositórios Diffusers normais
                pipe = AutoPipelineForText2Image.from_pretrained(IMAGE_MODEL_ID, **kwargs)
                logger.info("Pipeline carregado com from_pretrained() e opções: %s", kwargs)
            break
        except (OSError, ValueError, RuntimeError) as exc:
            last_exc = exc
            logger.warning("Falha ao carregar pipeline com método %s e %s: %s", method, kwargs, exc)

    if pipe is None:
        raise RuntimeError(
            "Não foi possível carregar o modelo de imagem. Verifique internet, permissões do modelo, "
            "formato do checkpoint e versões de diffusers/safetensors."
        ) from last_exc

    # Otimizações de memória adicionais
    if hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()
        logger.info("Attention slicing ativado para economia de memória")
        
    if hasattr(getattr(pipe, "vae", None), "enable_slicing"):
        pipe.vae.enable_slicing()
        logger.info("VAE slicing ativado para economia de memória")
    elif hasattr(pipe, "enable_vae_slicing"):
        pipe.enable_vae_slicing()
        logger.info("VAE slicing ativado para economia de memória")
        
    if hasattr(getattr(pipe, "vae", None), "enable_tiling"):
        pipe.vae.enable_tiling()
        logger.info("VAE tiling ativado para economia de memória")
    elif hasattr(pipe, "enable_vae_tiling"):
        pipe.enable_vae_tiling()
        logger.info("VAE tiling ativado para economia de memória")
        
    enable_best_attention_backend(pipe)

    apply_image_loras(pipe)

    # CPU offload apenas se não estiver usando quantização 8-bit
    if device == "cuda" and runtime["offload"] and not use_8bit and hasattr(pipe, "enable_model_cpu_offload"):
        pipe.enable_model_cpu_offload()
        logger.info("Model CPU offload ativado")
    elif not use_8bit:
        pipe.to(device)

    pipe.micro_jornal_device = device
    pipe.micro_jornal_cpu_mode = device == "cpu"
    pipe.micro_jornal_quantized = use_8bit
    
    if use_8bit:
        logger.info("Pipeline ChenkinNoob-XL configurado com quantização 8-bit (~10-11GB VRAM)")
    
    return pipe


def to_coloring_lineart(image: Image.Image) -> Image.Image:
    """Converte a imagem gerada em um delineamento suave para a criança colorir.

    A intenção é que a criança sinta que ela mesma produziu a ilustração, então o
    notebook entrega apenas um esboço inicial discreto:
    - contornos finos  -> cinza médio (COLORING_LINE_GRAY), vazados, para não marcar a pintura
    - manchas grossas e escuras (apenas os olhos) -> preto sólido
    - todo o restante (volumes do desenho) -> branco, sem cor, pronto para pintar
    """
    gray = ImageOps.grayscale(image.convert("RGB"))
    # "tinta": 0 = papel branco, 1 = traço bem escuro.
    ink = 1.0 - (np.asarray(gray, dtype=np.float32) / 255.0)

    ink_mask = ink >= COLORING_INK_THRESHOLD     # tudo que é traço (linha ou mancha)
    dark_mask = ink >= COLORING_SOLID_THRESHOLD  # apenas o que é quase preto

    # "Abertura" morfológica (erosão + dilatação): apaga os traços finos e preserva
    # só as manchas grossas, separando os olhos/detalhes preenchidos das linhas.
    thick_img = Image.fromarray((ink_mask.astype(np.uint8) * 255), mode="L")
    for _ in range(COLORING_OPEN_ITERS):
        thick_img = thick_img.filter(ImageFilter.MinFilter(3))
    for _ in range(COLORING_OPEN_ITERS):
        thick_img = thick_img.filter(ImageFilter.MaxFilter(3))
    thick_mask = np.asarray(thick_img) >= 128

    solid_mask = thick_mask & dark_mask          # apenas os olhos preenchidos de preto
    line_mask = ink_mask & ~thick_mask           # somente os contornos finos do desenho

    # Camada de linhas em cinza médio sobre fundo branco; manchas grossas claras
    # (sombreados que o modelo porventura criou) caem para branco -> interior vazio.
    line_layer = np.full(ink.shape, 255.0, dtype=np.float32)
    line_layer[line_mask] = float(COLORING_LINE_GRAY)
    line_img = Image.fromarray(line_layer.astype(np.uint8), mode="L")
    if COLORING_SOFT_BLUR_RADIUS > 0:
        # Suaviza apenas as linhas, para um delineamento "macio".
        line_img = line_img.filter(ImageFilter.GaussianBlur(COLORING_SOFT_BLUR_RADIUS))

    # Os olhos/detalhes pretos são carimbados por cima, mantendo-se nítidos.
    out = np.asarray(line_img, dtype=np.uint8).copy()
    out[solid_mask] = 0

    return Image.fromarray(out, mode="L").convert("RGBA")


def achatar_em_branco(image: Image.Image) -> Image.Image:
    """Achata qualquer transparência sobre fundo branco e devolve RGB.

    O ReportLab desenha o PNG sem máscara de alfa; sem isto, áreas transparentes
    poderiam virar preto dentro do PDF.
    """
    image = image.convert("RGBA")
    fundo = Image.new("RGBA", image.size, (255, 255, 255, 255))
    fundo.alpha_composite(image)
    return fundo.convert("RGB")


def _ink_mask_small(image: Image.Image) -> np.ndarray:
    gray = ImageOps.grayscale(image.convert("RGB")).resize((96, 96), Image.Resampling.BILINEAR)
    arr = np.asarray(gray, dtype=np.float32)
    return arr < 235


def imagem_tem_repeticao_provavel(image: Image.Image) -> bool:
    """Detecta duplicação grosseira de metades; evita painéis/figuras repetidas."""
    mask = _ink_mask_small(image)
    if mask.mean() < 0.015:
        return False

    left, right = mask[:, :48], np.fliplr(mask[:, 48:])
    top, bottom = mask[:48, :], np.flipud(mask[48:, :])
    lr_overlap = (left & right).sum() / max(1, (left | right).sum())
    tb_overlap = (top & bottom).sum() / max(1, (top | bottom).sum())
    return lr_overlap > 0.72 or tb_overlap > 0.72


def gerar_ilustracao(image_pipe, scene_prompt: str, caminho_salvar: str, indice: int = 0, role: str = "cover") -> None:
    """Gera uma ilustração ludosófica (linhas de contorno) e salva em disco.

    Substitui o antigo `gerar_desenho_ludosofico`: agora usa SDXL (+LoRA, se
    configurado), prompt de estilo rico, negative prompt detalhado e o
    pós-processamento "página de colorir".
    """
    prompt = build_prompt(scene_prompt, role=role, scene_index=indice)
    print(f"  Prompt visual ({role}): {prompt}")

    device = getattr(image_pipe, "micro_jornal_device", "cuda" if torch.cuda.is_available() else "cpu")
    cpu_mode = getattr(image_pipe, "micro_jornal_cpu_mode", device == "cpu")
    target_w, target_h = image_dimensions_for_role(role)
    width = min(target_w, 512) if cpu_mode else target_w
    height = min(target_h, 512) if cpu_mode else target_h
    steps = min(IMAGE_NUM_INFERENCE_STEPS, 6) if cpu_mode else IMAGE_NUM_INFERENCE_STEPS

    generator = None
    if IMAGE_SEED is not None:
        generator = torch.Generator(device=device).manual_seed(int(IMAGE_SEED) + indice)
    else:
        logger.info("Sem IMAGE_SEED definido; esta ilustração será não determinística.")

    raw_image = None
    last_result = None
    for attempt in range(MAX_IMAGE_RETRIES):
        attempt_prompt = prompt
        if attempt:
            attempt_prompt = f"{prompt}, single scene, no repetition, no duplicate figures"
            if IMAGE_SEED is not None:
                generator = torch.Generator(device=device).manual_seed(int(IMAGE_SEED) + indice + attempt * 997)

        with torch.inference_mode():
            call_kwargs = {
                "prompt": attempt_prompt,
                "width": width,
                "height": height,
                "num_inference_steps": steps,
                "guidance_scale": IMAGE_GUIDANCE_SCALE,
                "generator": generator,
            }
            if IMAGE_GUIDANCE_SCALE > 0:
                call_kwargs["negative_prompt"] = NEGATIVE_PROMPT
            last_result = image_pipe(**call_kwargs)

        if not getattr(last_result, "images", None):
            raise RuntimeError("O pipeline de imagem terminou sem retornar imagem.")

        raw_image = last_result.images[0]
        if not imagem_tem_repeticao_provavel(raw_image):
            break
        print("  Aviso: composição possivelmente duplicada; tentando regenerar com prompt mais restrito.")

    if raw_image is None:
        raise RuntimeError("O pipeline de imagem terminou sem retornar imagem.")
    final_image = to_coloring_lineart(raw_image) if COLORING_BOOK_MODE else raw_image.convert("RGBA")
    achatar_em_branco(final_image).save(caminho_salvar, format="PNG")
    clear_cuda_cache()


# ==============================================================================
# 6. SELEÇÃO E DESENHO DOS EMBLEMAS DOS ODS
# ==============================================================================
ODS_ICON_MAX_H = 64
ODS_ICON_GAP = 4 * mm
ODS_BACK_COVER_DROP = 15
ODS_ICON_LANGUAGE_CANDIDATES = ("pt-br", "pt", "en")

ODS_META = {
    1: ("Erradicação da pobreza", "#e5243b"),
    2: ("Fome zero e agricultura sustentável", "#dda63a"),
    3: ("Saúde e bem-estar", "#4c9f38"),
    4: ("Educação de qualidade", "#c5192d"),
    5: ("Igualdade de gênero", "#ff3a21"),
    6: ("Água potável e saneamento", "#26bde2"),
    7: ("Energia limpa e acessível", "#fcc30b"),
    8: ("Trabalho decente e crescimento econômico", "#a21942"),
    9: ("Indústria, inovação e infraestrutura", "#fd6925"),
    10: ("Redução das desigualdades", "#dd1367"),
    11: ("Cidades e comunidades sustentáveis", "#fd9d24"),
    12: ("Consumo e produção responsáveis", "#bf8b2e"),
    13: ("Ação contra a mudança global do clima", "#3f7e44"),
    14: ("Vida na água", "#0a97d9"),
    15: ("Vida terrestre", "#56c02b"),
    16: ("Paz, justiça e instituições eficazes", "#00689d"),
    17: ("Parcerias e meios de implementação", "#19486a"),
}

ODS_KEYWORDS = {
    1: ["pobreza", "pobre", "renda", "moradia", "sem teto", "vulnerabilidade", "necessidade"],
    2: ["fome", "alimento", "alimentação", "nutrição", "agricultura", "horta", "plantio", "colheita"],
    3: ["saúde", "bem-estar", "doença", "cuidado", "hospital", "medicina", "vacina", "corpo saudável"],
    4: ["educação", "escola", "aprendizagem", "aprender", "aprendeu", "ensinar", "ensinou", "estudar", "aula", "professor", "professora", "monitor explicou"],
    5: ["igualdade de gênero", "mulheres", "meninas", "meninos e meninas", "respeito às meninas", "empoderar"],
    6: ["água", "saneamento", "rio", "nascente", "lago", "lagoa", "chuva limpa", "esgoto", "água potável"],
    7: ["energia", "energia limpa", "solar", "solares", "vento", "eólica", "luz elétrica", "eletricidade"],
    8: ["trabalho", "emprego", "renda", "trabalhadores", "profissão", "economia", "comércio", "cooperativa"],
    9: ["inovação", "infraestrutura", "tecnologia", "engenharia", "construção", "indústria", "transporte"],
    10: ["desigualdade", "inclusão", "exclusão", "preconceito", "acessibilidade", "diferenças", "direitos iguais"],
    11: ["cidade", "bairro", "comunidade", "parque da cidade", "espaço público", "trilha", "assentamento", "lugar compartilhado", "espaços que compartilham"],
    12: ["lixo", "resíduo", "resíduos", "reciclável", "recicláveis", "reciclagem", "embalagem", "embalagens", "plástico", "descarte", "consumo", "reutilizar", "reaproveitar"],
    13: ["clima", "mudança do clima", "aquecimento", "seca", "enchente", "queimada", "carbono", "temperatura"],
    14: ["oceano", "mar", "mares", "praia", "peixe", "peixes", "recife", "mangue", "vida marinha"],
    15: ["natureza", "cerrado", "floresta", "árvore", "árvores", "planta", "plantas", "animal", "animais", "inseto", "insetos", "solo", "semente", "sementes", "muda", "mudas", "biodiversidade", "ecossistema", "seres vivos", "formigueiro", "flores"],
    16: ["paz", "justiça", "direitos", "conflito", "diálogo", "respeito", "combinado", "acordo", "instituição"],
    17: ["parceria", "parcerias", "colaboração", "cooperação", "trabalhar juntos", "juntos", "cada um faz a sua parte", "rede"],
}


def normalizar_texto(texto):
    texto = unicodedata.normalize("NFKD", texto.lower())
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    texto = re.sub(r"[^a-z0-9]+", " ", texto)
    return f" {texto} "


def contar_ocorrencias(texto_norm, termo):
    termo_norm = normalizar_texto(termo).strip()
    if not termo_norm:
        return 0
    return len(re.findall(rf"\b{re.escape(termo_norm)}\b", texto_norm))


def selecionar_ods_para_conto(titulo, texto):
    texto_norm = normalizar_texto(f"{titulo}\n{texto}")
    scores = {}
    for ods_id, termos in ODS_KEYWORDS.items():
        score = 0
        for termo in termos:
            ocorrencias = contar_ocorrencias(texto_norm, termo)
            peso = 2 if " " in normalizar_texto(termo).strip() else 1
            score += ocorrencias * peso
        if score:
            scores[ods_id] = score

    ordenados = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    selecionados = [ods_id for ods_id, _ in ordenados[:3]]

    for ods_padrao in (4, 11, 12, 15):
        if len(selecionados) >= 3:
            break
        if ods_padrao not in selecionados:
            selecionados.append(ods_padrao)

    return selecionados[:3]


def formatar_ods(ods_ids):
    return ", ".join(f"ODS {ods_id} - {ODS_META[ods_id][0]}" for ods_id in ods_ids)


def urls_emblema_ods(ods_id):
    for language in ODS_ICON_LANGUAGE_CANDIDATES:
        yield f"https://open-sdg.github.io/sdg-translations/assets/img/goals/{language}/{ods_id}.png"
        yield f"https://open-sdg.github.io/translations-un-sdg/assets/img/goals/{language}/{ods_id}.png"
    yield f"https://sustainabledevelopment.un.org/content/images/sdg_icons/sdg{ods_id}.png"


def baixar_emblema_ods(ods_id):
    caminho = os.path.join(ods_dir, f"ods_{ods_id}.png")
    if os.path.exists(caminho):
        return caminho

    for url in urls_emblema_ods(ods_id):
        try:
            with urllib.request.urlopen(url, timeout=20) as response:
                if getattr(response, "status", 200) != 200:
                    continue
                image_data = response.read()
            with open(caminho, "wb") as f:
                f.write(image_data)
            ImageReader(caminho).getSize()
            return caminho
        except Exception:
            if os.path.exists(caminho):
                os.remove(caminho)

    print(f"Aviso: não foi possível baixar o emblema do ODS {ods_id}. Usando marcador simples no PDF.")
    return None


def baixar_emblemas_ods():
    for ods_id in ODS_META:
        baixar_emblema_ods(ods_id)


def baixar_emblemas_do_drive(drive_service):
    """Baixa os 17 PNGs dos ODS diretamente da pasta do Drive configurada (ODS_FOLDER_ID).
    
    Esta função substitui o download de URLs externas e busca os PNGs
    que já estão na pasta do Drive, garantindo consistência visual.
    """
    if not ODS_FOLDER_ID:
        print("ODS_FOLDER_ID não configurado; usando os emblemas públicos.")
        baixar_emblemas_ods()
        return

    print(f"Baixando emblemas ODS da pasta do Drive {ODS_FOLDER_ID}...")
    
    # Mapeamento dos nomes dos arquivos PNG na pasta para os IDs dos ODS
    ods_filenames = {
        1: "erradicacao_da_pobreza.png",
        2: "fome_zero.png",
        3: "saude_e_bem_estar.png",
        4: "educacao_de_qualidade.png",
        5: "igualdade_de_genero.png",
        6: "agua_potavel_e_saneamento.png",
        7: "energia_limpa_e_acessivel.png",
        8: "trabalho_decente_e_crescimento_economico.png",
        9: "industria_inovacao_e_infraestrutura.png",
        10: "reducao_das_desigualdades.png",
        11: "cidades_e_comunidades_sustentaveis.png",
        12: "consumo_e_producao_responsaveis.png",
        13: "acao_contra_a_mudanca_global_do_clima.png",
        14: "vida_na_agua.png",
        15: "vida_terrestre.png",
        16: "paz_justica_e_instituicoes_eficazes.png",
        17: "parcerias_e_meios_de_implementacao.png",
    }
    def nome_ods_para_arquivo(nome: str) -> str:
        return normalizar_texto(nome).strip().replace(" ", "_")

    ods_filename_candidates = {}
    for ods_id, filename in ods_filenames.items():
        stem = filename.removesuffix(".png")
        official_stem = nome_ods_para_arquivo(ODS_META[ods_id][0])
        candidates = [
            filename,
            f"{stem}_150px.png",
            f"{official_stem}_150px.png",
            f"{official_stem}.png",
        ]
        ods_filename_candidates[ods_id] = list(dict.fromkeys(candidates))
    
    # Lista todos os arquivos na pasta ODS do Drive
    try:
        results = drive_service.files().list(
            q=f"'{ODS_FOLDER_ID}' in parents and mimeType contains 'image/png' and trashed=false",
            fields="files(id, name)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
        
        files = results.get("files", [])
        file_map = {f["name"]: f["id"] for f in files}
        
        print(f"  Encontrados {len(files)} arquivos PNG na pasta ODS do Drive")
        
        # Baixa cada PNG e salva localmente
        downloaded = 0
        for ods_id, filenames in ods_filename_candidates.items():
            caminho_local = os.path.join(ods_dir, f"ods_{ods_id}.png")
            
            # Se já existe localmente, pula
            if os.path.exists(caminho_local):
                continue
                
            # O nome canônico tem prioridade; variantes de resolução/nome são
            # apenas compatibilidade quando o arquivo contratual não existe.
            filename = next((name for name in filenames if name in file_map), None)
            if filename:
                file_id = file_map[filename]
                try:
                    request = drive_service.files().get_media(fileId=file_id)
                    import io
                    fh = io.BytesIO()
                    from googleapiclient.http import MediaIoBaseDownload
                    downloader = MediaIoBaseDownload(fh, request)
                    done = False
                    while not done:
                        status, done = downloader.next_chunk()
                    
                    fh.seek(0)
                    with open(caminho_local, "wb") as f:
                        f.write(fh.read())
                    downloaded += 1
                except Exception as e:
                    print(f"  Aviso: não foi possível baixar ODS {ods_id} ({filename}): {e}")
            else:
                print(f"  Aviso: arquivos {', '.join(filenames)} não encontrados na pasta ODS do Drive")
        
        missing_after_drive = [
            ods_id for ods_id in ods_filename_candidates
            if not os.path.exists(os.path.join(ods_dir, f"ods_{ods_id}.png"))
        ]
        if missing_after_drive:
            print(f"  {len(missing_after_drive)} emblemas ODS ausentes; tentando URLs públicas...")
            for ods_id in missing_after_drive:
                baixar_emblema_ods(ods_id)
        print(f"  {downloaded} novos emblemas ODS baixados do Drive")
        
    except Exception as e:
        print(f"  Erro ao buscar emblemas ODS do Drive: {e}")
        print("  Usando método alternativo (URLs públicas)...")
        baixar_emblemas_ods()


def draw_ods_fallback(c, ods_id, x, y, size):
    """Desenha marcador simples de ODS quando o PNG não está disponível."""
    c.saveState()
    c.setFillColor(HexColor(ODS_META[ods_id][1]))
    c.rect(x, y, size, size, stroke=0, fill=1)
    c.setFillColorRGB(1, 1, 1)
    c.setFont(font_name_bold, max(8, min(14, size * 0.23)))
    c.drawCentredString(x + size / 2, y + size * 0.54, f"ODS {ods_id}".upper())
    c.restoreState()


def draw_ods_icons_row(c, ods_ids, x, y, w, max_h=ODS_ICON_MAX_H):
    ods_ids = ods_ids[:3]
    if not ods_ids:
        return

    gap = ODS_ICON_GAP
    max_item_w = (w - gap * (len(ods_ids) - 1)) / len(ods_ids)
    icons = []

    for ods_id in ods_ids:
        caminho = os.path.join(ods_dir, f"ods_{ods_id}.png")
        if os.path.exists(caminho):
            try:
                img = ImageReader(caminho)
                iw, ih = img.getSize()
                scale = min(max_h / ih, max_item_w / iw)
                icons.append((ods_id, caminho, iw * scale, ih * scale))
                continue
            except Exception:
                pass

        size = min(max_h, max_item_w)
        icons.append((ods_id, None, size, size))

    total_w = sum(item[2] for item in icons) + gap * (len(icons) - 1)
    current_x = x + (w - total_w) / 2

    for ods_id, caminho, dw, dh in icons:
        icon_y = y + (max_h - dh) / 2
        if caminho:
            c.drawImage(caminho, current_x, icon_y, dw, dh, preserveAspectRatio=True, mask="auto")
        else:
            draw_ods_fallback(c, ods_id, current_x, icon_y, min(dw, dh))
        current_x += dw + gap


def draw_ods_summary_list(c, ods_ids, x, y, w, h):
    """Contra-capa limpa: três ODS, com nome por extenso em corpo pequeno."""
    ods_ids = ods_ids[:3]
    if not ods_ids:
        return

    def quebrar_nome_ods(nome: str, max_width: int = 30) -> list[str]:
        """Quebra nome do ODS em 2 linhas quando houver conectivo 'e'.
        
        Prioriza quebra no conectivo 'e' para melhor legibilidade.
        Se não houver 'e', usa quebra automática por tamanho.
        """
        nome = nome.strip()
        
        # Tenta quebrar no conectivo "e" (com espaços ao redor)
        if " e " in nome.lower():
            # Encontra a posição do " e " (case insensitive)
            partes_lower = nome.lower().split(" e ", 1)
            # Encontra a posição exata no texto original
            pos_e = len(nome) - len(nome.lower().replace(partes_lower[0].lower() + " e ", "", 1)) - 3
            pos_e = nome.lower().find(" e ")
            
            if pos_e > 0:
                # Pega até antes do "e" (primeira linha)
                linha1 = nome[:pos_e].strip()
                # Pega do "e" em diante (segunda linha)
                linha2 = nome[pos_e:].strip()
                
                # Valida que nenhuma linha ficou muito grande ou muito pequena
                if len(linha1) >= 8 and len(linha2) >= 8 and len(linha1) <= max_width * 1.5:
                    return [linha1, linha2]
        
        # Fallback: quebra automática por tamanho
        wrapped = textwrap.wrap(nome, width=max_width)
        return wrapped[:2] if wrapped else [nome]

    c.saveState()
    row_h = min(1.55 * cm, h / max(1, len(ods_ids)))
    icon_size = min(1.0 * cm, row_h * 0.70)
    gap = 0.28 * cm
    label_font_size = 9
    name_font_size = 6
    total_h = row_h * len(ods_ids)
    top = y + (h + total_h) / 2 - row_h

    for index, ods_id in enumerate(ods_ids):
        row_y = top - index * row_h
        label = f"ODS {ods_id}"
        nome_ods = ODS_META[ods_id][0].upper()
        icon_x = x + 0.2 * cm
        icon_y = row_y + (row_h - icon_size) / 2
        text_x = icon_x + icon_size + gap
        text_w = x + w - text_x
        caminho = os.path.join(ods_dir, f"ods_{ods_id}.png")

        if os.path.exists(caminho):
            try:
                c.drawImage(caminho, icon_x, icon_y, icon_size, icon_size, preserveAspectRatio=True, mask="auto")
            except Exception:
                draw_ods_fallback(c, ods_id, icon_x, icon_y, icon_size)
        else:
            draw_ods_fallback(c, ods_id, icon_x, icon_y, icon_size)

        c.setFillColorRGB(0.08, 0.08, 0.08)
        c.setFont(font_name_bold, label_font_size)
        c.drawString(text_x, row_y + row_h * 0.58, label)
        c.setFont(font_name, name_font_size)
        
        # Usa a nova função de quebra inteligente
        linhas_nome = quebrar_nome_ods(nome_ods, max_width=max(14, int(text_w / 3.0)))
        for offset, linha in enumerate(linhas_nome):
            c.drawString(text_x, row_y + row_h * (0.38 - offset * 0.17), linha)

    c.restoreState()


# ==============================================================================
# 7. FUNÇÕES DE DIAGRAMAÇÃO (REPORTLAB)
# ==============================================================================
# ------------------------------------------------------------------------------
# ESTILOS DE PARÁGRAFO (CONFIGURAÇÃO CRÍTICA)
# ------------------------------------------------------------------------------
# Os estilos abaixo controlam a aparência do texto nos PDFs.
# 
# ATENÇÃO: A configuração de parágrafos é crítica para garantir:
# 1. Recuo da primeira linha: 0.4 cm (firstLineIndent)
# 2. Espaço entre parágrafos: 0.2 cm (spaceAfter)
# 3. Sem espaço antes do parágrafo: 0 cm (spaceBefore)
#
# Estas medidas garantem que os parágrafos fiquem próximos mas legíveis,
# com a primeira linha recuada e espaçamento consistente entre eles.
# ------------------------------------------------------------------------------
margem = 0.5 * cm
page_width, page_height = landscape(A4)
panel_w = page_width / 4
panel_h = page_height / 2

styles = getSampleStyleSheet()
style_normal = styles["Normal"]
style_normal.fontName = font_name
style_normal.fontSize = 9
style_normal.leading = 12
style_normal.alignment = TA_JUSTIFY
style_normal.firstLineIndent = 0.4 * cm
# IMPORTANTE: spaceBefore deve ser 0 para não duplicar espaços entre parágrafos
style_normal.spaceBefore = 0
# Espaço curto entre parágrafos: mantém respiro sem abrir vazios no painel estreito.
style_normal.spaceAfter = 0.14 * cm
style_normal.splitLongWords = 1
style_normal.spaceShrinkage = 0.08
style_normal.justifyBreaks = 0
style_normal.justifyLastLine = 0

# Estilo para títulos/cabeçalhos em negrito
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.colors import black

style_heading = ParagraphStyle(
    "Heading",
    fontName=font_name_bold,
    fontSize=11,
    leading=14,
    alignment=TA_CENTER,
    spaceAfter=5,
    textColor=black,
)


def draw_guides(c, pw, ph):
    c.saveState()
    c.setStrokeColorRGB(0.82, 0.82, 0.82)
    c.setLineWidth(0.35)
    c.setDash(2, 2)
    c.rect(margem, margem, pw - 2 * margem, ph - 2 * margem, stroke=1, fill=0)
    for i in range(1, 4):
        x = i * panel_w
        c.line(x, margem, x, ph - margem)
    y = panel_h
    c.line(margem, y, pw - margem, y)
    c.setDash()
    c.restoreState()


def draw_panel_chrome(c, x, y, w, h, label="", invert=False):
    if not label:
        return

    c.saveState()
    if invert:
        c.translate(x + w / 2, y + h / 2)
        c.rotate(180)
        ox = -w / 2
        oy = -h / 2
    else:
        ox = x
        oy = y

    rule_y = oy + h - margem - 0.45 * cm
    c.setStrokeColorRGB(0.70, 0.70, 0.70)
    c.setLineWidth(0.35)
    c.line(ox + margem, rule_y, ox + w - margem, rule_y)
    c.setFillColorRGB(0.18, 0.18, 0.18)
    c.setFont(font_name_bold, 5.8)
    c.drawString(ox + margem, rule_y + 0.12 * cm, label.upper())
    c.restoreState()


def draw_micro_masthead(c, x, y, w, h, title, issue_label):
    c.saveState()
    c.setFillColorRGB(0.08, 0.08, 0.08)
    c.setFont(font_name_bold, 7.2)
    c.drawCentredString(x + w / 2, y + h - margem - 0.35 * cm, MICRO_JORNAL_NAME)
    c.setFont(font_name, 5.8)
    c.drawCentredString(x + w / 2, y + h - margem - 0.62 * cm, issue_label)
    c.setStrokeColorRGB(0.25, 0.25, 0.25)
    c.setLineWidth(0.45)
    c.line(x + margem, y + h - margem - 0.78 * cm, x + w - margem, y + h - margem - 0.78 * cm)
    c.restoreState()


def fit_image(c, img_path, x, y, w, h):
    if os.path.exists(img_path):
        img = ImageReader(img_path)
        iw, ih = img.getSize()
        scale = min(w / iw, h / ih)
        dw, dh = iw * scale, ih * scale
        dx = x + (w - dw) / 2
        dy = y + (h - dh) / 2
        c.drawImage(img, dx, dy, dw, dh, preserveAspectRatio=True)


def resolve_local_logo_path(filename=LOGO_FILENAME):
    """Localiza o logo na pasta do notebook/script, no cwd ou em /content."""
    candidates = []
    try:
        candidates.append(Path(__file__).resolve().parent / filename)
    except NameError:
        pass
    candidates.extend([
        Path.cwd() / filename,
        Path("/content") / filename,
        Path(contos_dir).parent / filename,
    ])

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return None


def draw_plantao_logo_below_school_mark(c, panel_x, text_baseline_y, panel_width):
    """Desenha plantao_escolar.png abaixo de 'EC 115 N | CRE-PP' na contracapa."""
    logo_path = resolve_local_logo_path()
    if not logo_path:
        print(f"Aviso: {LOGO_FILENAME} não encontrado localmente; contracapa sem logo.")
        return

    logo_size = 0.8 * cm
    logo_x = panel_x + (panel_width - logo_size) / 2
    logo_y = max(0.12 * cm, text_baseline_y - logo_size - 0.12 * cm)

    try:
        c.drawImage(
            ImageReader(logo_path),
            logo_x,
            logo_y,
            width=logo_size,
            height=logo_size,
            preserveAspectRatio=True,
            mask="auto",
        )
    except Exception as exc:
        print(f"Aviso: não foi possível inserir {LOGO_FILENAME} na contracapa ({exc}).")


def linhas_titulo_capa(titulo: str) -> list[str]:
    words = titulo.upper().split()
    if len(words) <= 3:
        return [" ".join(words)]

    linhas = []
    base = len(words) // 3
    extras = len(words) % 3
    cursor = 0
    for i in range(3):
        take = base + (1 if i < extras else 0)
        linhas.append(" ".join(words[cursor:cursor + take]))
        cursor += take
    return [linha for linha in linhas if linha]


def normalizar_paragrafos_conto(texto: str) -> list[str]:
    """Converte quebras internas em parágrafos reais e remove espaços duplicados."""
    linhas = [linha.strip() for linha in texto.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    paragrafos = []
    atual = []

    for linha in linhas:
        if not linha:
            if atual:
                paragrafos.append(" ".join(atual))
                atual = []
            continue

        atual.append(linha)
        if re.search(r"[.!?…]\s*$", linha):
            paragrafos.append(" ".join(atual))
            atual = []

    if atual:
        paragrafos.append(" ".join(atual))

    return [re.sub(r"\s+", " ", p).strip() for p in paragrafos if p.strip()]


def _remaining_frame_height(frame):
    return max(0, frame._y - frame._y1p)


def _text_frame_geometry(x, y, w, h, invert=False, bottom_reserve=0, top_reserve=0):
    if invert:
        fx = -w / 2 + margem
        fy = -h / 2 + margem + bottom_reserve
    else:
        fx = x + margem
        fy = y + margem + bottom_reserve

    fw = w - 2 * margem
    fh = h - 2 * margem - bottom_reserve - top_reserve
    return fx, fy, fw, fh


def _new_zero_padding_frame(x, y, w, h):
    return Frame(x, y, w, h, showBoundary=0, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)


def _plan_text_frame_cut(story, fw, fh, page_label="", validate_density=True):
    """Calcula e valida o corte do texto antes de desenhar no PDF final."""
    probe_canvas = canvas.Canvas(io.BytesIO(), pagesize=(fw, fh))
    frame = _new_zero_padding_frame(0, 0, fw, fh)
    pending = list(story)
    placed = []

    while pending:
        flowable = pending[0]
        if frame.add(flowable, probe_canvas):
            placed.append(flowable)
            pending.pop(0)
            continue

        available_height = _remaining_frame_height(frame)
        if available_height <= 0:
            break

        split_flowables = flowable.split(frame._aW, available_height)
        if not split_flowables:
            break

        first_fragment = split_flowables[0]
        if not frame.add(first_fragment, probe_canvas):
            break

        placed.append(first_fragment)
        pending = split_flowables[1:] + pending[1:]

    if story and not placed:
        label = f" em {page_label}" if page_label else ""
        raise RuntimeError(f"Diagramação travada{label}: nenhum parágrafo coube no painel.")

    remaining_height = _remaining_frame_height(frame)
    allowed_slack = max(style_normal.leading * 2.8, fh * 0.08)
    if validate_density and pending and remaining_height > allowed_slack:
        label = f" ({page_label})" if page_label else ""
        raise RuntimeError(
            "Diagramação subpreenchida"
            f"{label}: sobraram {remaining_height / cm:.2f} cm antes do fim do painel, "
            "mas ainda havia texto para continuar. Verifique o corte Paragraph/Frame."
        )

    return placed, pending


def draw_text_frame(
    c,
    x,
    y,
    w,
    h,
    story,
    invert=False,
    bottom_reserve=0,
    top_reserve=0,
    page_label="",
    validate_density=True,
):
    fx, fy, fw, fh = _text_frame_geometry(x, y, w, h, invert, bottom_reserve, top_reserve)
    placed, remaining = _plan_text_frame_cut(story, fw, fh, page_label=page_label, validate_density=validate_density)

    c.saveState()
    if invert:
        c.translate(x + w / 2, y + h / 2)
        c.rotate(180)

    frame = _new_zero_padding_frame(fx, fy, fw, fh)
    for flowable in placed:
        if not frame.add(flowable, c):
            label = f" em {page_label}" if page_label else ""
            raise RuntimeError(f"Falha ao desenhar corte previamente validado{label}.")

    c.restoreState()
    return remaining


def validar_pasta_drive(drive_service, folder_id, rotulo):
    pasta = (
        drive_service.files()
        .get(
            fileId=folder_id,
            fields="id,name,mimeType",
            supportsAllDrives=True,
        )
        .execute()
    )
    if pasta.get("mimeType") != "application/vnd.google-apps.folder":
        raise ValueError(f"{rotulo} não é uma pasta do Google Drive: {folder_id}")
    print(f"{rotulo}: {pasta.get('name')} ({folder_id})")
    return pasta


def limpar_contos_locais(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    for caminho in glob.glob(os.path.join(output_dir, "*.txt")):
        try:
            os.remove(caminho)
        except OSError:
            pass


def nome_arquivo_seguro(nome):
    nome = str(nome or "").replace("\\", "/")
    nome = os.path.basename(nome).replace("/", "_").strip()
    return nome or "conto.txt"


def caminho_txt_unico(output_dir, nome):
    base = nome_arquivo_seguro(nome)
    if not base.lower().endswith(".txt"):
        base += ".txt"
    stem, ext = os.path.splitext(base)
    caminho = os.path.join(output_dir, base)
    contador = 2
    while os.path.exists(caminho):
        caminho = os.path.join(output_dir, f"{stem}_{contador}{ext}")
        contador += 1
    return caminho


def baixar_arquivo_texto_drive(drive_service, arquivo, output_dir):
    import io

    nome = arquivo.get("name") or f"{arquivo['id']}.txt"
    caminho = caminho_txt_unico(output_dir, nome)
    mime_type = arquivo.get("mimeType", "")

    if mime_type.startswith("application/vnd.google-apps"):
        request = drive_service.files().export_media(fileId=arquivo["id"], mimeType="text/plain")
    else:
        request = drive_service.files().get_media(fileId=arquivo["id"])

    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        _status, done = downloader.next_chunk()

    fh.seek(0)
    with open(caminho, "wb") as f:
        f.write(fh.read())
    return caminho


def baixar_contos_do_drive_api(drive_service, folder_id, output_dir):
    """Baixa apenas contos .txt via Drive API autenticada, sem limite de 50 itens do gdown."""
    limpar_contos_locais(output_dir)
    print("Baixando contos via Google Drive API autenticada...")

    query = (
        f"'{folder_id}' in parents and trashed=false and "
        "(mimeType='text/plain' or mimeType='application/vnd.google-apps.document' or name contains '.txt')"
    )
    arquivos = []
    page_token = None
    while True:
        resposta = drive_service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType)",
            pageSize=1000,
            pageToken=page_token,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
        arquivos.extend(resposta.get("files", []))
        page_token = resposta.get("nextPageToken")
        if not page_token:
            break

    arquivos = sorted(arquivos, key=lambda item: (item.get("name") or "").lower())
    print(f"  Encontrados {len(arquivos)} arquivos de texto na pasta de origem.")

    caminhos = []
    for arquivo in arquivos:
        try:
            caminhos.append(baixar_arquivo_texto_drive(drive_service, arquivo, output_dir))
        except Exception as exc:
            print(f"  Aviso: não foi possível baixar {arquivo.get('name')} ({exc})")

    print(f"  {len(caminhos)} contos baixados via Drive API.")
    return sorted(caminhos)


def upload_to_drive(drive_service, file_path, folder_id):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF não encontrado para upload: {file_path}")
    file_metadata = {"name": os.path.basename(file_path), "parents": [folder_id]}
    media = MediaFileUpload(file_path, mimetype="application/pdf", resumable=True)
    file = (
        drive_service.files()
        .create(
            body=file_metadata,
            media_body=media,
            fields="id,name,webViewLink,parents",
            supportsAllDrives=True,
        )
        .execute()
    )
    return file


def tentar_upload_pdf(drive_service, output_path, folder_id, pdf_filename):
    """Envia um PDF ao Drive; retorna True quando precisar entrar no ZIP local."""
    try:
        print(f"Fazendo upload de {pdf_filename} para o Google Drive...")
        arquivo_drive = upload_to_drive(drive_service, output_path, folder_id)
        print(f"PDF salvo na Output_Folder: {arquivo_drive.get('webViewLink')}")
        return False
    except Exception as exc:
        print(f"Aviso: falha ao enviar {pdf_filename} ao Drive ({exc}). Será incluído no ZIP final.")
        return True


# ==============================================================================
# 8. EXECUÇÃO PRINCIPAL
# ==============================================================================
# --- Gemini (opcional): reescrita de cenas a partir do conto -------------------
text_client = None
if USE_GEMINI_TEXT_REWRITE:
    try:
        text_client = genai.Client(api_key=resolve_google_api_key())
    except Exception as e:
        print(f"Aviso: Gemini indisponível ({e}). Usarei cenas padrão para as ilustrações.")
        text_client = None

# --- Google Drive (opcional, com PLANO B de ZIP) ------------------------------
usar_drive = False
drive_service = None
print("Tentando autenticar no Google Drive para salvar os PDFs...")
try:
    if auth is None:
        raise RuntimeError("google.colab indisponível (execute no Colab para usar o Drive).")
    auth.authenticate_user()
    drive_service = build("drive", "v3", cache_discovery=False)
    validar_pasta_drive(drive_service, PASTA_DESTINO_ID, "Pasta de saída dos PDFs")
    usar_drive = True
    print("Autenticação no Drive concluída com sucesso!")
except Exception as e:
    print("\n⚠️ AVISO: não foi possível autenticar no Google Drive.")
    print(f"   ({e})")
    print("Não se preocupe! O código vai continuar, gerar os PDFs e baixar um arquivo ZIP no final.\n")

# --- Download dos contos -------------------------------------------------------
print("Baixando contos da pasta de origem...")
text_files = []
if usar_drive and drive_service:
    try:
        validar_pasta_drive(drive_service, PASTA_ORIGEM_ID, "Pasta de origem dos contos")
        text_files = baixar_contos_do_drive_api(drive_service, PASTA_ORIGEM_ID, contos_dir)
    except Exception as exc:
        print(f"Aviso: falha ao baixar contos pela Drive API ({exc}). Tentarei gdown como plano B.")

if not text_files:
    try:
        limpar_contos_locais(contos_dir)
        gdown.download_folder(
            f"https://drive.google.com/drive/folders/{PASTA_ORIGEM_ID}",
            output=contos_dir,
            quiet=True,
            use_cookies=False,
        )
        text_files = sorted(glob.glob(os.path.join(contos_dir, "*.txt")))
    except Exception as exc:
        print(f"Aviso: gdown também falhou ({exc}).")
        text_files = sorted(glob.glob(os.path.join(contos_dir, "*.txt")))

if not text_files:
    print("Nenhum arquivo .txt encontrado na pasta de origem!")
else:
    print(f"Encontrados {len(text_files)} contos para processar.")

    # --- Resumo da configuração ------------------------------------------------
    print(f"\nInput_Folder: {PASTA_ORIGEM_ID}")
    print(f"Output_Folder: {PASTA_DESTINO_ID}")
    print(f"Modelo de texto Gemini: {TEXT_MODEL_NAME if text_client else 'desativado'}")
    print(f"Modelo de imagem: {IMAGE_MODEL_ID}")
    print(f"Viés de ambientes naturais: {'ativado' if OUTDOOR_NATURE_BIAS else 'desativado'}")
    print(f"LoRAs de estilo: {len(IMAGE_LORAS)}")
    if not IMAGE_LORAS:
        print("LoRA de colorir: não configurado (defina COLORING_LORA_REPO para ativar).")
    print(f"Dispositivo de imagem: {describe_torch_device()}")
    print(f"Resolução: capa {COVER_IMAGE_WIDTH}x{COVER_IMAGE_HEIGHT}; última página {PAGE6_IMAGE_WIDTH}x{PAGE6_IMAGE_HEIGHT} ({ASPECT_RATIO})")
    print(f"Passos/guidance: {IMAGE_NUM_INFERENCE_STEPS} / {IMAGE_GUIDANCE_SCALE}")
    print(f"Ilustrações geradas por conto: {ILLUSTRATIONS_PER_STORY} (capa e última página; contra-capa sem imagem)")
    if COLORING_BOOK_MODE:
        print(
            f"Modo página de colorir: ATIVADO "
            f"(linhas em cinza {COLORING_LINE_GRAY}, olhos pretos, interiores em branco)"
        )
    else:
        print("Modo página de colorir: desativado")
    print(f"Saída Drive: {'ativada' if usar_drive else 'desativada (plano B: ZIP)'}\n")

    # --- Carrega o motor de imagem e os emblemas -------------------------------
    print("Carregando IA Geradora de Ilustrações (SDXL + LoRA)...")
    image_pipe = build_image_pipeline()

    print("Baixando emblemas dos ODS do Drive...")
    if usar_drive and drive_service and ODS_FOLDER_ID:
        baixar_emblemas_do_drive(drive_service)
    else:
        baixar_emblemas_ods()  # Fallback para URLs públicas

    precisa_zip = not usar_drive

    # --- Processa cada conto ---------------------------------------------------
    for idx, tf in enumerate(text_files):
        nome_arquivo = os.path.basename(tf)
        print(f"\n--- Processando Conto {idx + 1}/{len(text_files)}: {nome_arquivo} ---")

        with open(tf, "r", encoding="utf-8") as f:
            linhas = f.readlines()

        titulo = "Conto sem título"
        corpo_linhas = []
        for i, linha in enumerate(linhas):
            if linha.strip():
                titulo = linha.strip()
                corpo_linhas = linhas[i + 1:]
                break

        texto_corpo = "\n".join(corpo_linhas)
        ods_ids = selecionar_ods_para_conto(titulo, texto_corpo)
        print(f"ODS associados: {formatar_ods(ods_ids)}")

        story = []
        # ==============================================================
        # FORMATAÇÃO DE PARÁGRAFOS (CRÍTICO)
        # ==============================================================
        # Cada parágrafo usa style_normal com:
        # - firstLineIndent = 0.4 cm (recuo da primeira linha)
        # - spaceBefore = 0 cm (sem espaço antes para evitar duplicação)
        # - spaceAfter = 0.2 cm (espaço ENTRE parágrafos)
        #
        # Esta configuração garante:
        # 1. Primeira linha recuada em 0.4cm em TODOS os parágrafos
        # 2. Espaçamento consistente de 0.2cm entre parágrafos
        # 3. Parágrafos próximos sem espaços excessivos
        # ==============================================================
        for p in normalizar_paragrafos_conto(texto_corpo):
            # Converte todo o texto para CAIXA ALTA (consistente com base.py)
            story.append(Paragraph(p.upper(), style_normal))

        cover_img = os.path.join(img_dir, f"cover_{idx}.png")
        img_pagina6 = os.path.join(img_dir, f"page6_{idx}.png")

        print("Gerando ilustrações ludosóficas (capa e última página)...")
        cenas = preparar_cenas_para_geracao(gerar_cenas_do_conto(text_client, titulo, texto_corpo))
        gerar_ilustracao(image_pipe, cenas[0], cover_img, indice=idx * 2, role="cover")
        if ILLUSTRATIONS_PER_STORY >= 2:
            gerar_ilustracao(image_pipe, cenas[1], img_pagina6, indice=idx * 2 + 1, role="page6")
        else:
            shutil.copyfile(cover_img, img_pagina6)

        pdf_filename = nome_arquivo.replace(".txt", ".pdf")
        output_path = os.path.join(saida_dir, pdf_filename)
        c = canvas.Canvas(output_path, pagesize=landscape(A4))
        c.setTitle(titulo)
        c.setAuthor("EC 115 Norte")
        c.setSubject(formatar_ods(ods_ids))
        c.setCreator("notebook_pipeline.py - SDXL/Diffusers + Gemini")
        draw_guides(c, page_width, page_height)

        # --- FLUXO DE TEXTO NAS PÁGINAS (1 a 6) ---
        panel_labels = [
            (3 * panel_w, panel_h, "", True),
            (2 * panel_w, panel_h, "", True),
            (1 * panel_w, panel_h, "", True),
            (0 * panel_w, panel_h, "", True),
            (0 * panel_w, 0, "", False),
            (1 * panel_w, 0, "", False),
        ]
        for px, py, label, inv in panel_labels:
            draw_panel_chrome(c, px, py, panel_w, panel_h, label=label, invert=inv)

        story = draw_text_frame(c, 3 * panel_w, panel_h, panel_w, panel_h, story, invert=True, top_reserve=PANEL_HEADER_RESERVE, page_label="Pág. 1")  # Pág 1
        story = draw_text_frame(c, 2 * panel_w, panel_h, panel_w, panel_h, story, invert=True, top_reserve=PANEL_HEADER_RESERVE, page_label="Pág. 2")  # Pág 2
        story = draw_text_frame(c, 1 * panel_w, panel_h, panel_w, panel_h, story, invert=True, top_reserve=PANEL_HEADER_RESERVE, page_label="Pág. 3")  # Pág 3
        story = draw_text_frame(c, 0 * panel_w, panel_h, panel_w, panel_h, story, invert=True, top_reserve=PANEL_HEADER_RESERVE, page_label="Pág. 4")  # Pág 4
        story = draw_text_frame(c, 0 * panel_w, 0, panel_w, panel_h, story, invert=False, top_reserve=PANEL_HEADER_RESERVE, page_label="Pág. 5")  # Pág 5

        altura_img_pag6 = panel_h * 0.35
        story = draw_text_frame(
            c,
            1 * panel_w,
            0,
            panel_w,
            panel_h,
            story,
            invert=False,
            bottom_reserve=altura_img_pag6,
            top_reserve=PANEL_HEADER_RESERVE,
            page_label="Pág. 6",
            validate_density=False,
        )
        if story:
            raise RuntimeError(
                f"Texto excedeu as 6 páginas diagramáveis em {nome_arquivo}; "
                "o pipeline não corta a paginação nem descarta sobra de conto."
            )
        fit_image(c, img_pagina6, 1 * panel_w + margem, margem, panel_w - 2 * margem, altura_img_pag6 - margem)

        # --- CONTRA-CAPA ---
        draw_ods_summary_list(
            c,
            ods_ids,
            2 * panel_w + margem,
            margem + 1.25 * cm,
            panel_w - 2 * margem,
            panel_h - 2.35 * cm,
        )
        c.setFont(font_name_bold, 10)
        school_mark_y = margem + 1.15 * cm
        c.drawCentredString(2 * panel_w + panel_w / 2, school_mark_y, "EC 115 N | CRE-PP")
        draw_plantao_logo_below_school_mark(c, 2 * panel_w, school_mark_y, panel_w)

        # --- CAPA ---
        # Título perfeitamente centralizado acima da imagem (em CAIXA ALTA)
        c.setFont(font_name_bold, 10.5)
        linhas_titulo = linhas_titulo_capa(titulo)
        y_titulo = panel_h - margem - 0.45 * cm
        for linha_t in linhas_titulo:
            c.drawCentredString(3 * panel_w + panel_w / 2, y_titulo, linha_t)
            y_titulo -= 0.45 * cm

        # Imagem da capa
        fit_image(c, cover_img, 3 * panel_w + margem, margem + 1.25 * cm, panel_w - 2 * margem, panel_h - 2 * margem - 3.45 * cm)

        # Autor na base (em CAIXA ALTA)
        c.setFont(font_name, 12)
        c.drawCentredString(3 * panel_w + panel_w / 2, margem + 0.5 * cm, "POR                     ")

        c.showPage()
        c.save()

        if usar_drive:
            precisa_zip = tentar_upload_pdf(
                drive_service,
                output_path,
                PASTA_DESTINO_ID,
                pdf_filename,
            ) or precisa_zip

    # ==========================================================================
    # 9. FINALIZAÇÃO E DOWNLOAD LOCAL (PLANO B)
    # ==========================================================================
    if precisa_zip:
        print("\nEmpacotando os PDFs gerados para download...")
        zip_path = "/content/micro_jornais"
        shutil.make_archive(zip_path, "zip", saida_dir)
        if files is not None:
            print("Iniciando o download do arquivo ZIP para o seu computador...")
            files.download(f"{zip_path}.zip")
        print(f"✅ SUCESSO! PDFs em {saida_dir} e ZIP em {zip_path}.zip")
    else:
        print("\n✅ SUCESSO! Todos os contos foram processados e enviados para a pasta de destino no Google Drive.")











