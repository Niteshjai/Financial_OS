import os

def count_lines(directory):
    total_lines = 0
    file_count = 0
    extensions = {'.ts', '.tsx', '.py', '.sql', '.css', '.html', '.json'}
    
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if 'dist' in dirs:
            dirs.remove('dist')
        if 'build' in dirs:
            dirs.remove('build')
        if '.git' in dirs:
            dirs.remove('.git')
        if '.venv' in dirs:
            dirs.remove('.venv')
            
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in extensions:
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        lines = sum(1 for line in f)
                        total_lines += lines
                        file_count += 1
                except UnicodeDecodeError:
                    pass
    
    print(f"Total lines: {total_lines:,}")
    print(f"Files parsed: {file_count:,}")

count_lines(".")
