import os
import glob

# Search in Desktop folders (OneDrive or normal)
search_dirs = [
    'C:/Users/berka/OneDrive/Desktop',
    'C:/Users/berka/Desktop',
    'C:/Users/Public/Desktop'
]

print("Scanning directories...")
for d in search_dirs:
    if os.path.exists(d):
        print(f"Dir: {d}")
        for f in os.listdir(d):
            if f.endswith('.lnk') or '192' in f or 'f' == f:
                print(f"  File: {f}")
