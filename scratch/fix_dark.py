import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'import { cn }' not in content:
        content = content.replace('import Link from "next/link"', 'import Link from "next/link"\nimport { cn } from "@/lib/utils"')

    def replace_class(match):
        full_str = match.group(0)
        # Handle string literals: className="something dark:something"
        inner = match.group(1)
        classes = inner.split()
        
        base_classes = []
        light_dark_pairs = []
        
        # Simple mapping for pairs
        pair_map = {}
        for c in classes:
            if c.startswith('dark:'):
                dark_c = c[5:]
                # try to find the corresponding light class
                # This is heuristic. e.g. bg-slate-50 dark:bg-slate-950
                prefix = '-'.join(dark_c.split('-')[:-1]) if '-' in dark_c else dark_c
                # find a matching base class
                found_light = None
                for bc in base_classes:
                    if bc.startswith(prefix) or (prefix == 'text' and bc.startswith('text')) or (prefix == 'bg' and bc.startswith('bg')) or (prefix == 'border' and bc.startswith('border')) or (prefix == 'opacity' and bc.startswith('opacity')):
                        if not bc.startswith('hover:') and not dark_c.startswith('hover:'):
                            found_light = bc
                            break
                        elif bc.startswith('hover:') and dark_c.startswith('hover:'):
                            found_light = bc
                            break
                if found_light:
                    base_classes.remove(found_light)
                    light_dark_pairs.append((found_light, dark_c))
                else:
                    # just append dark separately if no light found
                    light_dark_pairs.append(("", dark_c))
            else:
                base_classes.append(c)
                
        if not light_dark_pairs:
            return full_str
            
        # Reconstruct
        cn_args = []
        if base_classes:
            cn_args.append(f'"{ " ".join(base_classes) }"')
            
        for light, dark in light_dark_pairs:
            if light:
                cn_args.append(f'isDarkMode ? "{dark}" : "{light}"')
            else:
                cn_args.append(f'isDarkMode ? "{dark}" : ""')
                
        return f'className={{cn({", ".join(cn_args)})}}'
        
    # Replace className="xxx"
    content = re.sub(r'className="([^"]*dark:[^"]*)"', replace_class, content)
    
    # Replace className={`xxx`}
    def replace_template(match):
        inner = match.group(1)
        # if it has ${...}, skip to avoid complexity
        if '${' in inner: return match.group(0)
        return replace_class(re.match(r'className=`([^`]*)`', f'className="{inner}"'))
        
    content = re.sub(r'className={`([^`]*)`}', replace_template, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('src/app/admin/login/page.tsx')
process_file('src/app/teacher/login/page.tsx')
print("Done")
