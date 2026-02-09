from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import socket
import base64
import json
import time
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from urllib.parse import unquote, urlparse, parse_qs
import uuid
from datetime import datetime, timezone
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Models
class ConfigInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    raw: str
    protocol: str
    server: str
    port: int
    name: str
    country: str
    telegram_channel: Optional[str] = None
    is_telegram: bool = False

class TestResult(BaseModel):
    config_id: str
    protocol: str
    server: str
    port: int
    name: str
    country: str
    telegram_channel: Optional[str] = None
    is_telegram: bool = False
    success: bool
    latency_ms: float = -1
    tested_at: str = ""

class FetchRequest(BaseModel):
    url: str

class TestBatchRequest(BaseModel):
    configs: List[dict]

# Parse functions
def parse_config_name(fragment: str):
    decoded = unquote(fragment)
    name = decoded
    country = ""
    telegram_channel = None
    is_telegram = False
    
    if "::" in decoded:
        parts = decoded.rsplit("::", 1)
        country = parts[-1].strip()
        name = parts[0].strip()
    
    if ">>" in name:
        name = name.replace(">>", "").strip()
    
    clean_name = name.strip()
    
    if clean_name.startswith("@"):
        is_telegram = True
        telegram_channel = clean_name
    elif any(tag in clean_name.lower() for tag in ["telegram", "tel@", "t.me/"]):
        is_telegram = True
        telegram_channel = clean_name
    elif "@" in clean_name:
        at_part = clean_name[clean_name.index("@"):]
        if at_part:
            is_telegram = True
            telegram_channel = at_part.split("::")[0].split(":")[0].strip()
    
    return name, country, telegram_channel, is_telegram

def parse_ss(config_str: str) -> Optional[dict]:
    try:
        rest = config_str[5:]
        fragment = ""
        if "#" in rest:
            rest, fragment = rest.split("#", 1)
        
        if "@" in rest:
            encoded_part, server_part = rest.rsplit("@", 1)
            server_part = server_part.rstrip("/").split("?")[0]
            if ":" in server_part:
                server, port = server_part.rsplit(":", 1)
                port = int(port)
            else:
                return None
        else:
            decoded = base64.b64decode(rest + "==").decode("utf-8", errors="ignore")
            if "@" in decoded:
                _, server_part = decoded.rsplit("@", 1)
                if ":" in server_part:
                    server, port = server_part.rsplit(":", 1)
                    port = int(port)
                else:
                    return None
            else:
                return None
        
        name, country, telegram_channel, is_telegram = parse_config_name(fragment)
        
        return {
            "protocol": "shadowsocks",
            "server": server.strip(),
            "port": port,
            "name": name,
            "country": country,
            "telegram_channel": telegram_channel,
            "is_telegram": is_telegram,
        }
    except Exception as e:
        logger.debug(f"Failed to parse ss config: {e}")
        return None

def parse_vless(config_str: str) -> Optional[dict]:
    try:
        rest = config_str[8:]
        fragment = ""
        if "#" in rest:
            rest, fragment = rest.split("#", 1)
        
        if "@" in rest:
            _, server_part = rest.split("@", 1)
            server_part = server_part.split("?")[0].rstrip("/")
            
            if server_part.startswith("["):
                bracket_end = server_part.index("]")
                server = server_part[:bracket_end + 1]
                port_part = server_part[bracket_end + 1:]
                if port_part.startswith(":"):
                    port = int(port_part[1:])
                else:
                    port = 443
            elif ":" in server_part:
                server, port_str = server_part.rsplit(":", 1)
                port = int(port_str)
            else:
                server = server_part
                port = 443
        else:
            return None
        
        name, country, telegram_channel, is_telegram = parse_config_name(fragment)
        
        return {
            "protocol": "vless",
            "server": server.strip(),
            "port": port,
            "name": name,
            "country": country,
            "telegram_channel": telegram_channel,
            "is_telegram": is_telegram,
        }
    except Exception as e:
        logger.debug(f"Failed to parse vless config: {e}")
        return None

def parse_vmess(config_str: str) -> Optional[dict]:
    try:
        encoded = config_str[8:]
        padding = 4 - len(encoded) % 4
        if padding != 4:
            encoded += "=" * padding
        decoded = base64.b64decode(encoded).decode("utf-8", errors="ignore")
        data = json.loads(decoded)
        
        server = data.get("add", "")
        port = int(data.get("port", 443))
        ps = data.get("ps", "")
        
        name, country, telegram_channel, is_telegram = parse_config_name(ps)
        
        return {
            "protocol": "vmess",
            "server": server.strip(),
            "port": port,
            "name": name,
            "country": country,
            "telegram_channel": telegram_channel,
            "is_telegram": is_telegram,
        }
    except Exception as e:
        logger.debug(f"Failed to parse vmess config: {e}")
        return None

def parse_trojan(config_str: str) -> Optional[dict]:
    try:
        rest = config_str[9:]
        fragment = ""
        if "#" in rest:
            rest, fragment = rest.split("#", 1)
        
        if "@" in rest:
            _, server_part = rest.split("@", 1)
            server_part = server_part.split("?")[0].rstrip("/")
            if ":" in server_part:
                server, port_str = server_part.rsplit(":", 1)
                port = int(port_str)
            else:
                server = server_part
                port = 443
        else:
            return None
        
        name, country, telegram_channel, is_telegram = parse_config_name(fragment)
        
        return {
            "protocol": "trojan",
            "server": server.strip(),
            "port": port,
            "name": name,
            "country": country,
            "telegram_channel": telegram_channel,
            "is_telegram": is_telegram,
        }
    except Exception as e:
        logger.debug(f"Failed to parse trojan config: {e}")
        return None

def parse_config(raw: str) -> Optional[dict]:
    raw = raw.strip()
    if raw.startswith("ss://"):
        return parse_ss(raw)
    elif raw.startswith("vless://"):
        return parse_vless(raw)
    elif raw.startswith("vmess://"):
        return parse_vmess(raw)
    elif raw.startswith("trojan://"):
        return parse_trojan(raw)
    return None

async def test_tcp_connection(server: str, port: int, timeout: float = 3.0) -> tuple:
    """Test TCP connectivity and return (success, latency_ms)"""
    try:
        clean_server = server.strip("[]")
        start = time.time()
        loop = asyncio.get_event_loop()
        
        fut = asyncio.open_connection(clean_server, port)
        reader, writer = await asyncio.wait_for(fut, timeout=timeout)
        latency = (time.time() - start) * 1000
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True, round(latency, 1)
    except Exception as e:
        logger.debug(f"TCP test failed for {server}:{port} - {e}")
        return False, -1

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "V2Ray Config Tester API"}

@api_router.post("/configs/fetch")
async def fetch_configs(req: FetchRequest):
    """Fetch and parse configs from a subscription URL"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as hclient:
            resp = await hclient.get(req.url)
            resp.raise_for_status()
            content = resp.text
        
        lines = content.strip().split("\n")
        configs = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            parsed = parse_config(line)
            if parsed:
                config = ConfigInfo(
                    raw=line,
                    **parsed
                )
                configs.append(config.dict())
        
        # Save to MongoDB
        if configs:
            await db.configs.delete_many({})
            await db.configs.insert_many([{k: v for k, v in c.items()} for c in configs])
        
        return {
            "total": len(configs),
            "configs": configs
        }
    except Exception as e:
        logger.error(f"Failed to fetch configs: {e}")
        return {"error": str(e), "total": 0, "configs": []}

@api_router.post("/configs/test-batch")
async def test_batch(req: TestBatchRequest):
    """Test a batch of configs for TCP connectivity"""
    results = []
    
    async def test_one(cfg):
        server = cfg.get("server", "")
        port = cfg.get("port", 443)
        success, latency = await test_tcp_connection(server, port, timeout=3.0)
        return TestResult(
            config_id=cfg.get("id", ""),
            protocol=cfg.get("protocol", ""),
            server=server,
            port=port,
            name=cfg.get("name", ""),
            country=cfg.get("country", ""),
            telegram_channel=cfg.get("telegram_channel"),
            is_telegram=cfg.get("is_telegram", False),
            success=success,
            latency_ms=latency,
            tested_at=datetime.now(timezone.utc).isoformat()
        )
    
    # Run tests concurrently but limit concurrency
    semaphore = asyncio.Semaphore(10)
    
    async def limited_test(cfg):
        async with semaphore:
            return await test_one(cfg)
    
    tasks = [limited_test(cfg) for cfg in req.configs]
    test_results = await asyncio.gather(*tasks)
    
    results = [r.dict() for r in test_results]
    
    # Save results
    if results:
        for r in results:
            await db.test_results.update_one(
                {"config_id": r["config_id"]},
                {"$set": r},
                upsert=True
            )
    
    return {"results": results}

@api_router.get("/configs/results")
async def get_results():
    """Get all test results sorted by latency"""
    results = await db.test_results.find(
        {"success": True},
        {"_id": 0}
    ).sort("latency_ms", 1).to_list(1000)
    return {"results": results}

@api_router.delete("/configs/clear")
async def clear_configs():
    """Clear all configs and results"""
    await db.configs.delete_many({})
    await db.test_results.delete_many({})
    return {"message": "cleared"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
