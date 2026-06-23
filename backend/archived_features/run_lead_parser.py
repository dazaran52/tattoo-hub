import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.services.email_lead_agent import start_email_lead_agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("email_parser.log"),
        logging.StreamHandler()
    ]
)

if __name__ == "__main__":
    logger = logging.getLogger("email_parser_main")
    logger.info("Initializing Email Parser Daemon...")
    try:
        asyncio.run(start_email_lead_agent())
    except KeyboardInterrupt:
        logger.info("Shutting down Email Parser.")
    except Exception as e:
        logger.error(f"Fatal error in Email Parser: {e}")
