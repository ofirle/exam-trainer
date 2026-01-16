import json
import re

def reverse_hebrew(text):
    """Reverse the characters in a string to fix RTL/LTR issue."""
    return text[::-1]

def is_reversed_hebrew(text):
    """
    Detect if Hebrew text is reversed by checking for common patterns.
    """
    if not text:
        return False

    # Reversed question words that would appear if text is reversed
    # These are common Hebrew question starters written backwards
    reversed_patterns = [
        ' המ ',   # reversed "מה " (what)
        ' המ,',   # reversed "מה,"
        ',המ ',   # reversed " מה,"
        'המ?',    # reversed "?מה"
        ' ימ ',   # reversed "מי " (who)
        ' ךיא ',  # reversed "איך " (how)
        ' םאה ',  # reversed "האם " (is/does)
        'ןיחבמ',  # reversed "מבחין" (noticing)
        'תניפס',  # reversed "ספינת" (ship)
        'תישרפמ', # reversed "מפרשית" (sailboat)
        'ךמוטרח', # reversed "חרטומך" (your bow)
        'הגלפה',  # reversed "הפלגה" (sailing) - but wait this could be correct too
    ]

    # Correct patterns - if these exist, text is likely correct
    correct_patterns = [
        'מה ',    # "what"
        'מי ',    # "who"
        'איך ',   # "how"
        'האם ',   # "is/does"
        'הינך',   # "you are"
        'בעת ',   # "during"
        'כאשר',   # "when"
    ]

    # Check for correct patterns first
    for pattern in correct_patterns:
        if pattern in text:
            return False

    # Check for reversed patterns
    for pattern in reversed_patterns:
        if pattern in text:
            return True

    # Additional heuristic: check if text has "תעב" (reversed "בעת" - during)
    # at the end before punctuation
    if re.search(r'תעב[?.!]?$', text.strip()):
        return True

    return False

def fix_question(question):
    """Fix a single question object - reverse all Hebrew text."""
    fixed = question.copy()
    fixed['text'] = reverse_hebrew(question['text'])
    fixed['options'] = [reverse_hebrew(opt) for opt in question['options']]
    if 'category' in question:
        fixed['category'] = reverse_hebrew(question['category'])
    return fixed

def main():
    # Read the JSON file
    with open('src/data/sailing_questions.json', 'r', encoding='utf-8') as f:
        questions = json.load(f)

    # Count how many were fixed
    fixed_count = 0
    fixed_questions = []
    fixed_ids = []

    for q in questions:
        if is_reversed_hebrew(q.get('text', '')):
            fixed_questions.append(fix_question(q))
            fixed_count += 1
            fixed_ids.append(q['id'])
        else:
            fixed_questions.append(q)

    # Write back
    with open('src/data/sailing_questions.json', 'w', encoding='utf-8') as f:
        json.dump(fixed_questions, f, ensure_ascii=False, indent=2)

    print(f"Fixed {fixed_count} questions out of {len(questions)}")
    print(f"Fixed IDs: {fixed_ids[:20]}..." if len(fixed_ids) > 20 else f"Fixed IDs: {fixed_ids}")

if __name__ == '__main__':
    main()
