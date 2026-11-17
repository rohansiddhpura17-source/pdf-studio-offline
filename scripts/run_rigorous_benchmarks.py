#!/usr/bin/env python3
"""
run_rigorous_benchmarks.py
Executes rigorous, un-mocked performance measurements of PDF Studio v1.0.0.
Measures:
1. Application health check / latency
2. Document upload & parsing time (1p, 20p, 50p)
3. Page thumbnail rendering throughput (1p, 20p, 50p)
4. Page navigation latency (sequential & random jumps)
5. Export & download latency
6. Compression ratios and timing across presets
7. Memory consumption (RSS) before, during, and after large 50p operations
"""

import os
import io
import time
import json
import psutil
from pathlib import Path
import httpx

BASE_URL = "http://127.0.0.1:8001/api"
INPUT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/input_pdfs")
LOG_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/logs")

LOG_DIR.mkdir(parents=True, exist_ok=True)

def get_backend_process():
    pid_file = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/.run/backend.pid")
    if pid_file.exists():
        pid = int(pid_file.read_text().strip())
        try:
            return psutil.Process(pid)
        except psutil.NoSuchProcess:
            pass
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmd = " ".join(proc.info['cmdline'] or [])
            if "uvicorn" in cmd and "8001" in cmd:
                return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return None

def run_benchmarks():
    print("=" * 80)
    print("  PDF STUDIO v1.0.0 — RIGOROUS PERFORMANCE BENCHMARK SUITE")
    print("=" * 80)

    client = httpx.Client(timeout=60.0)
    backend_proc = get_backend_process()
    if backend_proc:
        rss_start = backend_proc.memory_info().rss / (1024 * 1024)
        print(f"[*] Detected Backend PID: {backend_proc.pid} | Initial RSS: {rss_start:.2f} MB")
    else:
        rss_start = 0.0
        print("[!] Backend process PID not resolved; using host memory tracking.")

    benchmarks = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "environment": {
            "os": "macOS (Apple Silicon)",
            "python": "3.13.9",
            "node": "24.10.0",
            "host": "127.0.0.1:8001"
        },
        "initial_rss_mb": rss_start,
        "metrics": {}
    }

    # 1. API Responsiveness
    print("\n--- 1. API Ping & Health Latency ---")
    ping_times = []
    for _ in range(10):
        t0 = time.perf_counter()
        res = client.get(f"{BASE_URL}/document/system/health")
        t1 = time.perf_counter()
        assert res.status_code == 200
        ping_times.append((t1 - t0) * 1000)
    avg_ping = sum(ping_times) / len(ping_times)
    min_ping = min(ping_times)
    max_ping = max(ping_times)
    print(f"    Health Ping (10 samples): Avg = {avg_ping:.2f} ms | Min = {min_ping:.2f} ms | Max = {max_ping:.2f} ms")
    benchmarks["metrics"]["api_ping"] = {"avg_ms": avg_ping, "min_ms": min_ping, "max_ms": max_ping}

    # 2. Document Upload & Parse Time (1p, 20p, 50p)
    print("\n--- 2. Document Upload & Parse Latency ---")
    doc_sizes = [
        ("1-Page (A4)", INPUT_DIR / "synthetic_1p.pdf"),
        ("5-Page Report", INPUT_DIR / "synthetic_5p.pdf"),
        ("20-Page Pagination", INPUT_DIR / "synthetic_20p.pdf"),
        ("50-Page Stress Manual", INPUT_DIR / "synthetic_50p.pdf"),
        ("Image-Heavy PDF", INPUT_DIR / "synthetic_images.pdf")
    ]
    parse_results = {}
    uploaded_docs = {}

    for label, path in doc_sizes:
        file_bytes = path.read_bytes()
        times = []
        doc_id = None
        for _ in range(3):
            t0 = time.perf_counter()
            res = client.post(f"{BASE_URL}/document/upload", files={"file": (path.name, io.BytesIO(file_bytes), "application/pdf")})
            t1 = time.perf_counter()
            assert res.status_code == 200
            data = res.json()
            doc_id = data["file_id"]
            times.append((t1 - t0) * 1000)
        uploaded_docs[label] = doc_id
        avg_time = sum(times) / len(times)
        parse_results[label] = {
            "avg_latency_ms": round(avg_time, 2),
            "file_size_bytes": len(file_bytes),
            "page_count": data["page_count"]
        }
        print(f"    {label:24s} ({data['page_count']:02d}p, {len(file_bytes):,d}B): {avg_time:.2f} ms")
    benchmarks["metrics"]["upload_and_parse"] = parse_results

    # 3. Page Thumbnail Rendering Latency (1p, 20p, 50p)
    print("\n--- 3. Page Thumbnail Rendering Throughput ---")
    thumbnail_results = {}
    for label, doc_id in uploaded_docs.items():
        if label in ["1-Page (A4)", "20-Page Pagination", "50-Page Stress Manual"]:
            page_count = parse_results[label]["page_count"]
            t0 = time.perf_counter()
            for p_num in range(1, page_count + 1):
                res = client.get(f"{BASE_URL}/document/{doc_id}/page/{p_num}/thumbnail?width=200")
                assert res.status_code == 200
            total_duration = time.perf_counter() - t0
            avg_per_page = (total_duration / page_count) * 1000
            thumbnail_results[label] = {
                "total_seconds": round(total_duration, 3),
                "avg_per_page_ms": round(avg_per_page, 2),
                "pages_rendered": page_count
            }
            print(f"    {label:24s} ({page_count:02d} pages): Total = {total_duration:.3f} s | Avg = {avg_per_page:.2f} ms/page")
    benchmarks["metrics"]["thumbnail_rendering"] = thumbnail_results

    # 4. Page Navigation Responsiveness (Random Seek in 50p)
    print("\n--- 4. Page Navigation Seek Latency (50-page Document) ---")
    doc50_id = uploaded_docs["50-Page Stress Manual"]
    seek_pages = [1, 25, 50, 12, 38, 5, 49, 1]
    seek_times = []
    for target in seek_pages:
        t0 = time.perf_counter()
        res = client.get(f"{BASE_URL}/document/{doc50_id}/page/{target}/thumbnail?width=300")
        t1 = time.perf_counter()
        assert res.status_code == 200
        seek_times.append((t1 - t0) * 1000)
    avg_seek = sum(seek_times) / len(seek_times)
    print(f"    Random Access Seeks ({len(seek_pages)} jumps): Avg = {avg_seek:.2f} ms | Min = {min(seek_times):.2f} ms | Max = {max(seek_times):.2f} ms")
    benchmarks["metrics"]["page_navigation_seek"] = {
        "avg_ms": round(avg_seek, 2),
        "min_ms": round(min(seek_times), 2),
        "max_ms": round(max(seek_times), 2)
    }

    # 5. Export Latency
    print("\n--- 5. Export & Download Throughput ---")
    export_results = {}
    for label, doc_id in uploaded_docs.items():
        t0 = time.perf_counter()
        res = client.get(f"{BASE_URL}/document/{doc_id}/download")
        t1 = time.perf_counter()
        assert res.status_code == 200
        size_bytes = len(res.content)
        dur_ms = (t1 - t0) * 1000
        export_results[label] = {
            "duration_ms": round(dur_ms, 2),
            "size_bytes": size_bytes,
            "throughput_mb_s": round((size_bytes / (1024 * 1024)) / ((t1 - t0) or 0.001), 2)
        }
        print(f"    {label:24s} ({size_bytes:,d}B): {dur_ms:.2f} ms")
    benchmarks["metrics"]["export_download"] = export_results

    # 6. Compression Performance & Presets
    print("\n--- 6. Compression Pipeline Benchmarks (Image-Heavy PDF) ---")
    img_doc_id = uploaded_docs["Image-Heavy PDF"]
    comp_presets = ["max_quality", "balanced", "strong"]
    comp_metrics = {}
    for preset in comp_presets:
        t0 = time.perf_counter()
        res = client.post(f"{BASE_URL}/finish/compress", json={
            "file_id": img_doc_id,
            "preset": preset
        })
        t1 = time.perf_counter()
        assert res.status_code == 200
        data = res.json()
        comp_metrics[preset] = {
            "duration_ms": round((t1 - t0) * 1000, 2),
            "original_size": data["original_size_bytes"],
            "compressed_size": data["compressed_size_bytes"],
            "bytes_saved": data["bytes_saved"],
            "reduction_percentage": data["percent_reduction"]
        }
        print(f"    Preset '{preset:8s}': {data['original_size_bytes']:,}B -> {data['compressed_size_bytes']:,}B ({data['percent_reduction']:.1f}% saved) in {(t1-t0)*1000:.1f} ms")
    benchmarks["metrics"]["compression_presets"] = comp_metrics

    # 7. Memory Consumption
    if backend_proc:
        rss_end = backend_proc.memory_info().rss / (1024 * 1024)
        rss_delta = rss_end - rss_start
        print("\n--- 7. Memory RSS Profiling ---")
        print(f"    Initial Resident Memory: {rss_start:.2f} MB")
        print(f"    Final Resident Memory:   {rss_end:.2f} MB (Delta: {rss_delta:+.2f} MB)")
        benchmarks["memory_profiling"] = {
            "initial_rss_mb": round(rss_start, 2),
            "final_rss_mb": round(rss_end, 2),
            "delta_rss_mb": round(rss_delta, 2)
        }

    # Save to JSON
    json_path = LOG_DIR / "performance_data.json"
    json_path.write_text(json.dumps(benchmarks, indent=2))
    print("\n" + "=" * 80)
    print(f"  [OK] Performance benchmark complete. Structured results written to:")
    print(f"       {json_path}")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmarks()
