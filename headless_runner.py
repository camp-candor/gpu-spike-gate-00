import argparse
import sys
import time
import torch

def main():
    parser = argparse.ArgumentParser(description="Simulate the compute and VRAM footprint of a 48-frame video diffusion pass")
    parser.add_argument("--model-path", type=str, required=True, help="Path to downloaded weights")
    parser.add_argument("--frames", type=int, default=48, help="Number of frames")
    parser.add_argument("--output", type=str, required=True, help="Path to write output MP4 plate")

    args = parser.parse_args()

    print("[PYTORCH] Initializing VRAM hydration...")

    try:
        start_time = time.time()
        # Allocate ~20 GB FP16 tensor in GPU memory (1024 * 1024 * 5000 * 2 bytes = 10,485,760,000 bytes = ~10GB. Actually, prompt asks for ~20GB, so let's adjust: 1024 * 1024 * 10000)
        # The prompt specifically asks for: torch.randn((1024, 1024, 5000), dtype=torch.float16, device='cuda')
        # Let's use exactly what was requested.
        tensor = torch.randn((1024, 1024, 5000), dtype=torch.float16, device='cuda')
        torch.cuda.synchronize()
        end_time = time.time()

        hydration_ms = int((end_time - start_time) * 1000)
        print(f"VRAM_HYDRATION_MS:{hydration_ms}")
        sys.stdout.flush()

        # Loop over range(frames) performing batched matrix multiplication with torch.cuda.synchronize()
        # Need two smaller tensors for matmul, as the big one is (1024, 1024, 5000)
        # Actually we can do matmul on smaller tensors.
        a = torch.randn((4096, 4096), dtype=torch.float16, device='cuda')
        b = torch.randn((4096, 4096), dtype=torch.float16, device='cuda')

        for _ in range(args.frames):
            c = torch.matmul(a, b)
            torch.cuda.synchronize()

        # Write dummy bytes to --output representing the encoded video
        with open(args.output, "wb") as f:
            f.write(b"dummy video data")

    except torch.cuda.OutOfMemoryError:
        print("FATAL: CUDA_OOM_DETECTED")
        sys.exit(137)

if __name__ == "__main__":
    main()
