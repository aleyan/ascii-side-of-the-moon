# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

import json
import os
from pathlib import Path

def load_moon_data():
    """Load moon data from the ascii.json file."""
    # Get the script directory and navigate to the ascii.json file
    script_dir = Path(__file__).parent
    ascii_file = script_dir.parent / "src" / "render" / "ascii.json"
    
    try:
        with open(ascii_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('moons', [])
    except FileNotFoundError:
        print(f"Error: Could not find {ascii_file}")
        return []
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {ascii_file}")
        return []
    except Exception as e:
        print(f"Error loading moon data: {e}")
        return []

def analyze_ascii_art(ascii_text):
    """Analyze ASCII art and return statistics."""
    lines = ascii_text.split('\n')
    
    # Count total lines
    total_lines = len(lines)
    
    # Count non-whitespace lines (lines with at least one non-whitespace character)
    # A line is considered empty if it contains only spaces, tabs, or other whitespace
    non_whitespace_lines = sum(1 for line in lines if line.strip() != '')
    
    # Find the widest line and count columns
    max_width = max(len(line) for line in lines) if lines else 0
    
    # Find the line with the most non-whitespace characters
    max_non_whitespace_cols = 0
    for line in lines:
        # Count non-whitespace characters in this line
        non_ws_chars = len([char for char in line if not char.isspace()])
        max_non_whitespace_cols = max(max_non_whitespace_cols, non_ws_chars)
    
    return {
        'total_lines': total_lines,
        'non_whitespace_lines': non_whitespace_lines,
        'total_columns': max_width,
        'non_whitespace_columns': max_non_whitespace_cols
    }

def print_moon_info(moon):
    """Print detailed information for a single moon on one line."""
    print(f"Moon #{moon['index']} | Distance: {moon['distance_km']:.1f} km | Libration: {moon['libration_elat']:.3f}° lat, {moon['libration_elon']:.3f}° lon")
    
    # Analyze the ASCII art
    stats = analyze_ascii_art(moon['ascii'])
    print(f"ASCII Stats: {stats['total_lines']} lines ({stats['non_whitespace_lines']} non-empty) | {stats['total_columns']} cols max | {stats['non_whitespace_columns']} non-whitespace cols max")
    
    print("ASCII Representation:")
    print(moon['ascii'])
    print()

def main():
    """Main function to load and display all moon data."""
    print("🌙 ASCII Side of the Moon - Moon Data Display")
    print("=" * 50)
    print()
    
    moons = load_moon_data()
    
    if not moons:
        print("No moon data found.")
        return
    
    print(f"Found {len(moons)} moons in the dataset.")
    print()
    
    for i, moon in enumerate(moons):
        print_moon_info(moon)
        
        # Add two empty lines between moons (except after the last one)
        if i < len(moons) - 1:
            print()
            print()

if __name__ == "__main__":
    main()


