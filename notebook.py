# notebook.py
"""
@overview Este notebook Python é projetado para ser executado no Google Colab.
           Ele facilita a interação com o Google Apps Script (GAS) e a Google Sheets,
           além de fornecer um ambiente para análises de dados mais complexas e
           integração com APIs Python, como a do Google Gemini, para tarefas
           que exigem processamento fora do ambiente do GAS.

@author Manus AI
@version 1.0.0
@since 2026-05-28

@dependencies
  - google-auth-oauthlib: Para autenticação OAuth 2.0 com as APIs do Google.
  - google-api-python-client: Para interagir com as APIs do Google (Sheets, Drive, Gemini).
  - pandas: Para manipulação e análise de dados.
  - matplotlib, seaborn: Para visualização de dados.
  - google-generativeai: SDK oficial do Google Gemini para Python.

@integrations
  - Google Sheets: Leitura e escrita de dados para a planilha central do projeto.
  - Google Drive: Acesso a arquivos e pastas relacionados ao projeto.
  - Google Apps Script: Comunicação bidirecional para acionar funções GAS e vice-versa.
  - Google Gemini API: Para processamento de linguagem natural, geração de texto,
    análise de sentimentos, sumarização, etc., complementando as capacidades agenticas.

@description
  Este notebook serve como uma ponte entre o ambiente do Google Colab e o ecossistema
  do Google Apps Script/Sheets. Ele permite:
  1. Autenticação segura com as APIs do Google.
  2. Leitura e escrita programática de dados na Google Sheet principal.
  3. Execução de análises de dados complexas que seriam inviáveis ou lentas no GAS.
  4. Utilização do Google Gemini para aprimorar as funcionalidades agenticas do sistema,
     como gerar insights a partir de dados de avaliação de projetos, criar resumos
     de discussões de tarefas, ou auxiliar na criação de prompts para outras ferramentas.
  5. Geração de visualizações de dados para relatórios.
  6. Pode ser configurado para ser executado via gatilhos do Colab ou de forma manual.

  As credenciais da API Gemini e o SPREADSHEETS_ID devem ser configurados como
  variáveis de ambiente no Google Apps Script ou passados de forma segura.
"""

# 1. Configuração Inicial e Autenticação

# Instalar bibliotecas necessárias (se não estiverem já instaladas no ambiente Colab)
!pip install --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib pandas matplotlib seaborn google-generativeai

import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from google.colab import auth
from google.auth import default
from googleapiclient.discovery import build
import google.generativeai as genai

# Autenticação no Google Colab
# Isso irá abrir uma janela de autenticação no seu navegador.
auth.authenticate_user()
creds, project = default()

# Construir serviços para Google Sheets e Google Drive
service_sheets = build('sheets', 'v4', credentials=creds)
service_drive = build('drive', 'v3', credentials=creds)

# Configurar a API Gemini
# A chave da API Gemini deve ser obtida de forma segura, por exemplo, de variáveis de ambiente
# ou de um serviço de gerenciamento de segredos. Para este exemplo, assumimos que ela será
# fornecida diretamente ou via um método seguro.
# Substitua 'YOUR_GEMINI_API_KEY' pela sua chave real da API Gemini.
# É recomendado armazenar isso em um ambiente seguro, não diretamente no código.
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

# ID da Google Sheet central (substitua pelo seu ID real)
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID', '1l7KSGocRZrvYUOJ3AeXGpaxL2R44IRIJcsZ43bn6myQ')

# ID da pasta do Google Drive para recursos do projeto (substitua pelo seu ID real)
DRIVE_FOLDER_ID = os.environ.get('DRIVE_FOLDER_ID', '1LOgvK1EWD8sQHifeem7cPKQp5GMqtp-X')

print("Configuração e autenticação concluídas.")

# 2. Funções de Interação com Google Sheets

def read_sheet_data(range_name):
    """Lê dados de uma aba específica da Google Sheet."""
    result = service_sheets.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range=range_name).execute()
    values = result.get('values', [])
    if not values:
        print(f'Nenhum dado encontrado no range: {range_name}')
        return pd.DataFrame()
    headers = values[0]
    data = values[1:]
    return pd.DataFrame(data, columns=headers)

def write_sheet_data(range_name, values, value_input_option='RAW'):
    """Escreve dados em uma aba específica da Google Sheet."""
    body = {
        'values': values
    }
    result = service_sheets.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID, range=range_name,
        valueInputOption=value_input_option, body=body).execute()
    print(f"{result.get('updatedCells')} células atualizadas.")
    return result

def append_sheet_data(range_name, values, value_input_option='RAW'):
    """Adiciona dados ao final de uma aba específica da Google Sheet."""
    body = {
        'values': values
    }
    result = service_sheets.spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID, range=range_name,
        valueInputOption=value_input_option, body=body).execute()
    print(f"{result.get('updates').get('updatedCells')} células adicionadas.")
    return result

# 3. Funções de Interação com Google Drive

def list_drive_files(folder_id=DRIVE_FOLDER_ID):
    """Lista arquivos em uma pasta específica do Google Drive."""
    query = f"'{folder_id}' in parents and trashed = false"
    results = service_drive.files().list(
        q=query,
        pageSize=10,
        fields="nextPageToken, files(id, name, mimeType, webViewLink)").execute()
    items = results.get('files', [])
    if not items:
        print('Nenhum arquivo encontrado.')
        return []
    print('Arquivos:')
    for item in items:
        print(u'{0} ({1}) - {2}'.format(item['name'], item['id'], item['webViewLink']))
    return items

# 4. Funções de Análise de Dados (Exemplos)

def analyze_project_adherence(project_evaluations_df):
    """Analisa a aderência média dos projetos."""
    if project_evaluations_df.empty:
        print("Nenhum dado de avaliação de projeto para analisar.")
        return

    project_evaluations_df['PontuacaoAderencia'] = pd.to_numeric(project_evaluations_df['PontuacaoAderencia'], errors='coerce')
    avg_adherence_by_project = project_evaluations_df.groupby('ProjetoID')['PontuacaoAderencia'].mean().reset_index()
    avg_adherence_by_project.columns = ['ProjetoID', 'MediaAderencia']
    print("\nMédia de Aderência por Projeto:")
    print(avg_adherence_by_project)

    plt.figure(figsize=(10, 6))
    sns.barplot(x='ProjetoID', y='MediaAderencia', data=avg_adherence_by_project)
    plt.title('Média de Aderência por Projeto')
    plt.xlabel('ID do Projeto')
    plt.ylabel('Pontuação Média de Aderência')
    plt.show()
    return avg_adherence_by_project

def analyze_team_understanding(project_evaluations_df):
    """Analisa a compreensão média da equipe."""
    if project_evaluations_df.empty:
        print("Nenhum dado de avaliação de projeto para analisar.")
        return

    project_evaluations_df['PontuacaoCompreensao'] = pd.to_numeric(project_evaluations_df['PontuacaoCompreensao'], errors='coerce')
    avg_understanding_by_user = project_evaluations_df.groupby('UsuarioEmail')['PontuacaoCompreensao'].mean().reset_index()
    avg_understanding_by_user.columns = ['UsuarioEmail', 'MediaCompreensao']
    print("\nMédia de Compreensão por Usuário:")
    print(avg_understanding_by_user)

    plt.figure(figsize=(10, 6))
    sns.barplot(x='UsuarioEmail', y='MediaCompreensao', data=avg_understanding_by_user)
    plt.title('Média de Compreensão por Usuário')
    plt.xlabel('Email do Usuário')
    plt.ylabel('Pontuação Média de Compreensão')
    plt.xticks(rotation=45)
    plt.show()
    return avg_understanding_by_user

# 5. Funções de Interação com Google Gemini

def get_gemini_model():
    """Retorna uma instância do modelo Gemini Pro."""
    return genai.GenerativeModel('gemini-pro')

def generate_feedback_with_gemini(prompt_text):
    """
    Gera feedback usando o modelo Gemini com base em um prompt.
    Integração com a funcionalidade agentica para aprimorar o conjunto de skills.
    """
    model = get_gemini_model()
    try:
        response = model.generate_content(prompt_text)
        return response.text
    except Exception as e:
        print(f"Erro ao gerar conteúdo com Gemini: {e}")
        return "Não foi possível gerar feedback automatizado da Gemini."

def summarize_text_with_gemini(text_to_summarize):
    """
    Sumariza um texto longo usando o modelo Gemini.
    Útil para resumir discussões de tarefas ou descrições de projetos.
    """
    prompt = f"Por favor, sumarize o seguinte texto de forma concisa e objetiva: {text_to_summarize}"
    return generate_feedback_with_gemini(prompt)

# 6. Exemplos de Uso

if __name__ == '__main__':
    print("\n--- Iniciando exemplos de uso ---")

    # Exemplo 1: Ler dados de usuários
    print("\nLendo dados da aba 'Users'...")
    users_df = read_sheet_data('Users')
    print(users_df.head())

    # Exemplo 2: Ler dados de projetos
    print("\nLendo dados da aba 'Projects'...")
    projects_df = read_sheet_data('Projects')
    print(projects_df.head())

    # Exemplo 3: Ler dados de avaliações de projeto
    print("\nLendo dados da aba 'ProjectEvaluations'...")
    project_evaluations_df = read_sheet_data('ProjectEvaluations')
    print(project_evaluations_df.head())

    # Exemplo 4: Análise de aderência de projeto
    if not project_evaluations_df.empty:
        analyze_project_adherence(project_evaluations_df)

    # Exemplo 5: Análise de compreensão da equipe
    if not project_evaluations_df.empty:
        analyze_team_understanding(project_evaluations_df)

    # Exemplo 6: Gerar feedback com Gemini (requer uma chave de API Gemini válida)
    if GEMINI_API_KEY != 'YOUR_GEMINI_API_KEY':
        print("\nGerando feedback com Gemini...")
        sample_prompt = "O projeto X teve uma aderência de 60% e compreensão de 70%. Os comentários foram: 'A equipe teve dificuldades com a nova tecnologia.' Forneça um feedback construtivo."
        gemini_response = generate_feedback_with_gemini(sample_prompt)
        print("Feedback Gemini:", gemini_response)
    else:
        print("\nChave da API Gemini não configurada. Pulando exemplo de geração de feedback.")

    # Exemplo 7: Listar arquivos do Google Drive
    print("\nListando arquivos na pasta do Drive...")
    drive_files = list_drive_files()
    if drive_files:
        print(f"Encontrados {len(drive_files)} arquivos.")

    print("\n--- Exemplos de uso concluídos ---")
