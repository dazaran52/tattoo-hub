import pytest
from unittest.mock import MagicMock, AsyncMock

@pytest.fixture
def mock_imap(mocker):
    mock = mocker.patch('imaplib.IMAP4_SSL', autospec=True)
    instance = mock.return_value
    instance.login.return_value = ('OK', [b'Login successful'])
    instance.select.return_value = ('OK', [b'1'])
    instance.search.return_value = ('OK', [b'1 2'])
    instance.fetch.return_value = ('OK', [b'(BODY[TEXT] {5}\r\nHello)', b')'])
    instance.append.return_value = ('OK', [b'Append successful'])
    return instance

@pytest.fixture
def mock_smtp(mocker):
    mock = mocker.patch('smtplib.SMTP_SSL', autospec=True)
    instance = mock.return_value
    instance.login.return_value = (235, b'Authentication successful')
    instance.send_message.return_value = {}
    return instance

@pytest.fixture
def mock_gemini(mocker):
    mock = mocker.patch('app.services.email_lead_agent.call_gemini_api', new_callable=AsyncMock)
    
    default_response = {
        "reply": "Hello from mock AI",
        "completed": False,
        "extracted": {
            "style": "realism",
            "location": "arm",
            "size": "10cm",
            "budget_amount": 100,
            "budget_currency": "EUR",
            "has_references": False,
            "idea": "A cool tattoo",
            "client_country_code": "DE"
        }
    }
    
    mock.return_value = default_response
    return mock

@pytest.fixture
def db_client(mocker):
    # Stateful mock of Supabase client since we can't spin up testcontainers easily
    mock = mocker.patch('app.services.email_lead_agent.get_supabase_client')
    instance = MagicMock()
    mock.return_value = instance
    
    # Simple state
    db = {'email_lead_conversations': [], 'leads': [], 'dummy': []}
    
    table_mock = MagicMock()
    table_mock.select = MagicMock(return_value=table_mock)
    table_mock.eq = MagicMock(return_value=table_mock)
    table_mock.in_ = MagicMock(return_value=table_mock)
    
    mock_execute = MagicMock()
    class MockResult:
        pass
    res = MockResult()
    res.data = []
    mock_execute.return_value = res
    table_mock.execute = mock_execute
    
    exec_mock = MagicMock()
    exec_res = MockResult()
    exec_res.data = []
    exec_mock.execute.return_value = exec_res
    
    table_mock.insert = MagicMock(return_value=exec_mock)
    table_mock.update = MagicMock(return_value=exec_mock)
    
    def mock_table(table_name="dummy"):
        return table_mock
        
    instance.table = mock_table
    instance.db_state = db
    return instance

@pytest.fixture
def api_client(mocker):
    # Fastapi or similar mock client
    mock = mocker.patch('httpx.AsyncClient')
    return mock.return_value

@pytest.fixture
def page(mocker):
    # Playwright page mock
    return MagicMock()
