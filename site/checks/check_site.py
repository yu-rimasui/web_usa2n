"""Run with python3 checks/check_site.py; no third-party packages required."""
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.references, self.anchors = [], [], []
        self.headings = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        self.headings += tag == 'h1'
        for key in ('src', 'href'):
            value = attrs.get(key, '')
            if value.startswith('#'):
                self.anchors.append(value[1:])
            elif value and not value.startswith(('http:', 'https:', 'mailto:')):
                self.references.append(value)
        for value in attrs.get('srcset', '').split(','):
            if value.strip():
                self.references.append(value.strip().split()[0])
        if tag == 'img':
            assert 'alt' in attrs, 'Image needs alt text'
        if 'data-dialog' in attrs:
            self.anchors.append(attrs['data-dialog'])


page = Page()
page.feed((root / 'index.html').read_text())
assert page.headings == 1, 'Exactly one main heading is required'
assert len(page.ids) == len(set(page.ids)), 'IDs must be unique'
assert all(anchor in page.ids for anchor in page.anchors), 'Broken internal link'
for reference in page.references:
    local = reference.lstrip('/')
    assert (root / local).is_file() or (root / 'public' / local).is_file(), f'Missing asset: {reference}'
assert 'sofa.webp' not in (root / 'index.html').read_text(), 'Reference images are mood references only'
print(f'PASS: {len(page.references)} asset references, {len(page.anchors)} anchors, unique IDs, image labels')
