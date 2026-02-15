from app.services.system import get_host_stats


def test_get_host_stats():
    stats = get_host_stats()
    assert "cpu_percent" in stats
    assert "memory_percent" in stats
    assert "disk_percent" in stats
    assert stats["memory_total_gb"] > 0
    assert stats["disk_total_gb"] > 0
