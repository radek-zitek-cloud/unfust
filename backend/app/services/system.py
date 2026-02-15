import logging

import psutil

logger = logging.getLogger(__name__)


def get_host_stats() -> dict:
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / (1024**3), 2),
        "memory_total_gb": round(mem.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
    }


def get_container_stats() -> list[dict] | None:
    try:
        import docker

        client = docker.from_env()
        containers = client.containers.list()
        return [
            {
                "name": c.name,
                "status": c.status,
                "image": str(c.image.tags[0]) if c.image.tags else str(c.image.id[:12]),
            }
            for c in containers
        ]
    except Exception:
        logger.debug("Docker not available for container stats")
        return None
