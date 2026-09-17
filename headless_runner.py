import argparse
import time
import sys
import torch

def main():
    parser = argparse.ArgumentParser(description="Headless Runner for Gate 0")
    parser.add_argument("--model-path", type=str, required=True, help="Path to downloaded weights")
    parser.add_argument("--frames", type=int, default=48, help="Number of frames to render")
    parser.add_argument("--output", type=str, required=True, help="Path to write output MP4 plate")
    
    args = parser.parse_args()
    
    print("[PYTORCH] Initializing VRAM hydration...", flush=True)
    
    start_hydration = time.time()
    try:
        # Allocate ~20 GB FP16 tensor in GPU memory
        # 1024 * 1024 * 5000 * 2 bytes = 10,485,760,000 bytes (~10.5 GB)
        # Wait, the prompt says ~20 GB FP16 tensor. Let's adjust dimensions
        # 1024 * 1024 * 10000 * 2 bytes = 20,971,520,000 bytes (~20 GB)
        tensor = torch.randn((1024, 1024, 10000), dtype=torch.float16, device='cuda')
        torch.cuda.synchronize()
    except torch.cuda.OutOfMemoryError:
        print("FATAL: CUDA_OOM_DETECTED", file=sys.stderr, flush=True)
        sys.exit(137)
        
    end_hydration = time.time()
    hydration_ms = int((end_hydration - start_hydration) * 1000)
    print(f"VRAM_HYDRATION_MS:{hydration_ms}", flush=True)
    
    # Run frames
    # Simulate batched matrix multiplication to keep tensor cores pinned at 100%
    try:
        mat1 = torch.randn((4096, 4096), dtype=torch.float16, device='cuda')
        mat2 = torch.randn((4096, 4096), dtype=torch.float16, device='cuda')
        
        for i in range(args.frames):
            # perform matmul to keep cores busy
            for _ in range(10): # do a few matmuls per frame
                res = torch.matmul(mat1, mat2)
            torch.cuda.synchronize()
    except torch.cuda.OutOfMemoryError:
        print("FATAL: CUDA_OOM_DETECTED", file=sys.stderr, flush=True)
        sys.exit(137)
        
    # Write dummy bytes to output representing the encoded video
    with open(args.output, 'wb') as f:
        f.write(b'DUMMY_MP4_DATA')

if __name__ == "__main__":
    main()
