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

def print_moon_info(moon):
    """Print detailed information for a single moon on one line."""
    print(f"Moon #{moon['index']} | Distance: {moon['distance_km']:.1f} km | Libration: {moon['libration_elat']:.3f}° lat, {moon['libration_elon']:.3f}° lon")
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


