"""Generate every IRoD subpage from data, in the same drawing-set design as the homepage.

Sources (all inside the repo):
  data/projects/*.json   research projects, edited through Pages CMS (.pages.yml)
  data/site/cv.json      publications, grants, awards, service of the PI
  data/site/openings.json  text of the open-position pages
  tools/vi.json          Vietnamese for long fixed text (key = escaped English)
Run: python tools/gen.py      (also run by .github/workflows/build.yml on every push)
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
E = html.escape
BS = chr(92)

# ------------------------------------------------------------------ i18n ----
# Every visible string is emitted in both languages; CSS shows one by html[data-lang].
# Long strings are looked up in tools/vi.json (key = the escaped English HTML); anything
# missing is written to tools/vi_todo.json and falls back to English.
VIF = os.path.join(ROOT, 'tools', 'vi.json')
VI = json.load(open(VIF, encoding='utf8')) if os.path.exists(VIF) else {}
TODO = {}
def V(en):
    v = VI.get(en)
    if not v:
        TODO[en] = ''
        return en
    return v
def t(en, vi=None):
    if vi is None: vi = V(en)
    if vi == en: return en
    return '<span data-l="en">%s</span><span data-l="vi" lang="vi">%s</span>' % (en, vi)
def plain_vi(en_html):
    return re.sub(r'<[^>]+>', '', html.unescape(V(en_html)))
TAG_VI = {'robotics': 'robot học', 'mechanism design': 'thiết kế cơ cấu', 'control': 'điều khiển', 'manufacturing': 'sản xuất',
          'rehabilitation': 'phục hồi chức năng', 'medical robotics': 'robot y tế'}
ROLE_VI = {'Principal Investigator': 'Trưởng nhóm nghiên cứu', 'Post-Doctoral Researcher': 'Nghiên cứu viên sau tiến sĩ', 'PhD Student': 'Nghiên cứu sinh',
           'Master Student': 'Học viên cao học', 'Research Assistant': 'Trợ lý nghiên cứu'}
KIND_VI = {'Service': 'Hoạt động', 'Award': 'Giải thưởng', 'Grant': 'Đề tài', 'Opening': 'Tuyển dụng', 'Talk': 'Báo cáo', 'Lab': 'Phòng lab'}
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
def date_vi(d):
    m = re.match(r'^(\w+) (\d+), (\d{4})$', d)
    if m and m.group(1) in MONTHS: return '%s/%02d/%s' % (m.group(2).zfill(2), MONTHS.index(m.group(1)) + 1, m.group(3))
    m = re.match(r'^(\w{3}) (\d{4})$', d)
    if m: return 'Tháng %d/%s' % ([x[:3] for x in MONTHS].index(m.group(1)) + 1, m.group(2))
    return d
def tags_t(tags): return t(E(' · '.join(tags)), E(' · '.join(TAG_VI.get(x, x) for x in tags)))

# ---------------------------------------------------------------- data ----
def _load_json(*parts):
    return json.load(open(os.path.join(DATA, *parts), encoding='utf8'))

def _tags(v):
    if isinstance(v, str): v = [x.strip() for x in v.split(',')]
    return [str(x).strip() for x in (v or []) if str(x).strip()]

def _img(v):
    if isinstance(v, list): v = v[0] if v else ''
    return str(v or '').strip().lstrip('/')

def _date(v, year):
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', str(v or ''))
    if not m: return str(year or '')
    return '%s %d, %s' % (MONTHS[int(m.group(2)) - 1], int(m.group(3)), m.group(1))

def load_projects():
    out = []
    folder = os.path.join(DATA, 'projects')
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith('.json'): continue
        d = json.load(open(os.path.join(folder, fn), encoding='utf8'))
        if d.get('hidden'): continue
        slug = re.sub(r'[^a-z0-9-]+', '-', str(d.get('slug') or fn[:-5]).lower()).strip('-')
        title = str(d.get('title_en') or '').strip()
        if not slug or not title: continue
        year = d.get('year') or (str(d.get('date') or '')[:4])
        try: year = int(year)
        except (TypeError, ValueError): year = ''
        en_text = str(d.get('summary_en') or '').strip()
        out.append(dict(
            slug=slug, title=title, title_vi=str(d.get('title_vi') or '').strip() or title,
            year=year, iso=str(d.get('date') or ''), date=_date(d.get('date'), year), tags=_tags(d.get('tags')),
            img=_img(d.get('image')), w=d.get('image_w'), h=d.get('image_h'),
            alt=str(d.get('alt_en') or title), alt_vi=str(d.get('alt_vi') or d.get('alt_en') or d.get('title_vi') or title),
            text=en_text, text_vi=str(d.get('summary_vi') or '').strip() or en_text,
            refs=[(str(r.get('text') or '').strip(), str(r.get('url') or '').strip() or None) for r in (d.get('refs') or []) if isinstance(r, dict) and r.get('text')],
            order=d.get('order'), area=str(d.get('area') or '').strip(),
        ))
    # explicit order first (smallest first), then newest
    out.sort(key=lambda p: p['iso'], reverse=True)                      # newest date first
    out.sort(key=lambda p: p['year'] or 0, reverse=True)                # then by year of work
    def _ord(p):
        try: return (0, float(p['order']))
        except (TypeError, ValueError): return (1, 0)
    out.sort(key=_ord)                                                   # an explicit order wins
    return out

def wh(p):
    return (' width="%s" height="%s"' % (p['w'], p['h'])) if p.get('w') and p.get('h') else ''

PROJECTS = []

PEOPLE = [
    dict(id='linh.nv', en='Nguyen Vu Linh', vi='Nguyễn Vũ Linh', role='Principal Investigator', img='linh.avif',
         line='Assistant Professor & Associate Program Director of Mechanical Engineering, VinUniversity'),
    dict(id='tien.dn', en='Nguyen Duc Tien', vi='Nguyễn Đức Tiến', role='Post-Doctoral Researcher', img='tiennd.jpg'),
    dict(id='toan.ld', en='Luu Duc Toan', vi='Lưu Đức Toàn', role='PhD Student', img='toanld2.jpg'),
    dict(id='an.lm', en='Le Minh An', vi='Lê Minh An', role='Master Student', img='anlm.jpg'),
    dict(id='phong.nh', en='Nguyen Hai Phong', vi='Nguyễn Hải Phong', role='Research Assistant', img='phongnh.jpg'),
    dict(id='nam.nv', en='Nguyen Van Nam', vi='Nguyễn Văn Nam', role='Research Assistant', img='anh1.jpg'),
    dict(id='tri.nvt', en='Nguyen Van Thanh Tri', vi='Nguyễn Văn Thành Trí', role='Research Assistant', img='tri.nvt.jpg'),
    dict(id='pham-khac-toan', en='Pham Khac Toan', vi='Phạm Khắc Toàn', role='Research Assistant', img='toanpk.jpg'),
]
# Has a page on the old site but is not on the team listing; keep the page, do not invent a role.
UNLISTED = [dict(id='chinh.td', en='Tran Duong Chinh', vi='Trần Dương Chính', role=None, img=None)]
ROLE_ORDER = [('Post-Doctoral Researcher', 'Post-doctoral researchers'), ('PhD Student', 'PhD students'),
              ('Master Student', 'Master students'), ('Research Assistant', 'Research assistants')]

# News, every item sourced from the PI's CV or the old Openings page.
NEWS = [
    ('2026', 'Service', 'Dr. Nguyen Vu Linh serves as General Chair of the 9th IFToMM International Symposium on Robotics and Mechatronics (ISRM 2026), Hanoi, and co-edits its proceedings, <i>Robotics and Mechatronics: Proceedings of ISRM 2026</i> (Mechanisms and Machine Science, vol. 213).', None),
    ('2026', 'Award', 'Reviewer of the Year 2025 Award, ASME Journal of Mechanical Design.', None),
    ('2026', 'Award', 'Finalist for Best Research Paper, IFToMM International Symposium on Robotics and Mechatronics (ISRM), Hanoi.', None),
    ('2026', 'Grant', 'New projects led by the lab: smart and adaptive robotic systems for stroke recovery (Vingroup Innovation Foundation), physics-guided scientific machine learning for trustworthy mechanical systems (VinUni–NTU Center for AI Research), and variable-stiffness actuators with reinforcement learning control for rehabilitation (ReVSA-Rehab, CECS Seed Grant).', None),
    ('2026', 'Grant', 'The lab joins a Marie Skłodowska-Curie Actions project on responsible generative AI in healthcare, an intelligent biomimetic humanoid robot for patient assistance (co-PI), and autonomous multi-robot EV charging (AIREC).', None),
    ('Nov 2025', 'Opening', 'Calls for PhD and Postdoc applications in rehabilitation robotics with the VinUni-Illinois Smart Health Center.', 'content/openings/index.html'),
    ('2025', 'Award', 'Faculty of the Year 2025 Award, VinUniversity.', None),
    ('2025', 'Award', 'Best Research Paper, IFToMM Conference on Mechanisms, Transmissions and Applications (MeTrApp), Taoyuan, Taiwan.', None),
    ('2025', 'Award', 'IFToMM Young Delegates Program (YDP) Award.', None),
    ('2025', 'Service', 'Dr. Nguyen Vu Linh becomes Associate Editor of ASME Letters in Translational Robotics.', None),
    ('Oct 2024', 'Talk', 'SICE Luncheon Seminar, "Gravity Compensation for Robots and Mechanisms", IEEE/RSJ IROS 2024, Abu Dhabi.', None),
    ('Aug 2024', 'Award', 'JMR Best Paper Honorable Mention Award (2023 volume), ASME Journal of Mechanisms and Robotics.', None),
    ('2024', 'Grant', 'Start of "The future of rehabilitation robotics: a framework for human-robot interaction for complete training and assessment", VinUni-Illinois Smart Health Center (PI).', None),
    ('May 2023', 'Award', 'Best Application Paper, IFToMM MeTrApp, Poitiers, France.', None),
    ('Feb 2023', 'Lab', 'Dr. Nguyen Vu Linh joins VinUniversity as Assistant Professor of Mechanical Engineering. The Interactive Robot Design Lab starts at the College of Engineering and Computer Science.', None),
]

# ------------------------------------------------------------- helpers ----
def read(p): return open(p, encoding='utf8').read()

def strip(t):
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()

def norm(t): return re.sub(r'[^a-z0-9]+', ' ', t.lower())

def find_link(entry, links):
    words = [w for w in norm(entry).split() if len(w) > 3]
    key = ' '.join(words[3:11]) if len(words) > 11 else ' '.join(words)
    best = None
    for n, url in links:
        nw = set(w for w in n.split() if len(w) > 3)
        hit = sum(1 for w in words if w in nw)
        if hit >= max(6, int(len(set(words)) * 0.7)) and (not best or hit > best[0]): best = (hit, url)
    return best[1] if best else None

def pub_html(entry, links):
    t = re.sub(r'\s*\(Link\)\.?\s*$', '', entry).strip()
    t = t.replace(' – ', ' to ').replace('–', '-').replace('—', ', ')
    m = re.search(r'\b(20\d\d|19\d\d)\b(?!.*\b(20\d\d|19\d\d)\b)', t)
    year = m.group(1) if m else ''
    u = find_link(t, links)
    body = E(t).replace('Nguyen*', 'Nguyen<sup>*</sup>')
    body = re.sub(r'(V\. ?L\. Nguyen|VL Nguyen|L\. V\. Nguyen|V\. L\. Nguyen)', r'<b>\1</b>', body)
    if u: body += ' <a class="pub__link" href="%s">Link</a>' % E(u)
    return year, body

# -------------------------------------------------------------- chrome ----
# Top bar, same five items as requested: HOME, RESEARCH, PUBLICATIONS, PEOPLE, JOIN.
# The third field is the section key a page passes to page(); it marks the current item.
NAV = [('Home', 'Trang chủ', 'index.html', 'Home'), ('Research', 'Nghiên cứu', 'content/research/index.html', 'Research'),
       ('Publications', 'Công bố', 'content/publications/index.html', 'Publications'),
       ('People', 'Thành viên', 'content/people/index.html', 'People'), ('Join', 'Tham gia', 'content/openings/index.html', 'Openings')]
# The footer also lists News, which is no longer in the bar.
FOOT = NAV[:2] + [('News', 'Tin tức', 'content/news/index.html', 'News')] + NAV[2:]

FONTS = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap'

# Runs before first paint: stored choice, else the system setting / browser language.
BOOT = '''<script>(function(){var d=document.documentElement,s=null;try{s=window.localStorage}catch(e){}
var th=null,la=null;try{th=s&&s.getItem('irod-theme');la=s&&s.getItem('irod-lang')}catch(e){}
if(th!=='dark'&&th!=='light')th=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
if(la!=='en'&&la!=='vi')la=/^vi/i.test(navigator.language||'')?'vi':'en';
d.setAttribute('data-theme',th);d.setAttribute('data-lang',la);d.lang=la;})();</script>'''

SUN = '<svg class="ic ic--sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>'
MOON = '<svg class="ic ic--moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z"/></svg>'

GH = '<svg class="ic ic--fill" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>'
MENU = '<svg class="ic" viewBox="0 0 30 30" aria-hidden="true" focusable="false"><path d="M4 7h22M4 15h22M4 23h22" stroke-width="2"/></svg>'

def bar(pre, section):
    """Two-tier header after robotics.sites.tau.ac.il: a masthead with the lab mark and full name, then a
    ruled navigation strip that sticks to the top while scrolling. Below 992px the sections fold into a menu."""
    nav = ''.join('<li><a href="%s%s"%s>%s</a></li>' % (pre, href, ' aria-current="page"' if key == section else '', t(en, vi)) for en, vi, href, key in NAV)
    return f'''<header class="mast">
  <div class="ch__wrap mast__in">
    <a class="mast__brand" href="{pre}index.html" aria-label="Interactive Robot Design Lab, home" data-aria-vi="Interactive Robot Design Lab, trang chủ">
      <span class="mast__tile"><img src="{pre}images/logo.png" alt="" width="698" height="427"></span>
      <span class="mast__text"><span class="mast__name">Interactive Robot Design Lab</span><span class="mast__sub">{t('College of Engineering and Computer Science · VinUniversity', 'Viện Kỹ thuật và Khoa học Máy tính · Trường Đại học VinUni')}</span></span>
    </a>
    <div class="bar__tools">
      <a class="bar__gh" href="https://github.com/IROD-Lab" aria-label="IRoD Lab on GitHub" data-aria-vi="IRoD Lab trên GitHub">{GH}</a>
      <div class="seg" role="group" aria-label="Language" data-aria-vi="Ngôn ngữ"><button type="button" class="seg__b" data-set-lang="en" aria-pressed="true">EN</button><button type="button" class="seg__b" data-set-lang="vi" aria-pressed="false">VI</button></div>
      <button type="button" class="themeb" data-theme-toggle aria-label="Switch to dark mode">{SUN}{MOON}</button>
    </div>
  </div>
</header>
<div class="bar">
  <div class="ch__wrap bar__in">
    <a class="bar__short" href="{pre}index.html">IRoD Lab</a>
    <nav class="bar__nav" id="site-nav" aria-label="Site" data-aria-vi="Điều hướng"><ul class="navlist">{nav}</ul></nav>
    <button type="button" class="bar__menu" aria-expanded="false" aria-controls="site-nav" aria-label="Menu" data-aria-vi="Mở menu">{MENU}</button>
  </div>
</div>'''

def page(path, title, desc, section, code, sheet_title, body, title_vi=None, sheet_vi=None, home=False):
    depth = path.count('/')
    pre = '../' * depth
    if title_vi is None: title_vi = plain_vi(E(title))
    if sheet_vi is None: sheet_vi = sheet_title
    full_en = E(title) if home else '%s · Interactive Robot Design Lab' % E(title)
    full_vi = E(title_vi) if home else '%s · Interactive Robot Design Lab' % E(title_vi)
    out = f'''<!doctype html>
<html lang="en" data-title-vi="{full_vi}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{full_en}</title>
<meta name="description" content="{E(desc)}">
<meta name="color-scheme" content="light dark">
{BOOT}
<link rel="icon" href="{pre}images/favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="{pre}scrollcraft.css">
<link rel="stylesheet" href="{pre}site.css">
<link rel="stylesheet" href="{pre}pages.css">
<link rel="stylesheet" href="{pre}theme.css">
</head>
<body class="{'home' if home else 'sub'}">
<a class="skip" href="#main">{t('Skip to content', 'Chuyển đến nội dung chính')}</a>
{bar(pre, section)}
<main id="main" tabindex="-1">
{body}
</main>
{footer(pre)}
<script src="{pre}ui.js"></script>
<script src="{pre}scrollcraft.js"></script>
<script>
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('[data-sc-count]').forEach(function (n) {{ n.removeAttribute('data-sc-count'); }});
  ScrollCraft.mount(document.body);
</script>
<script src="{pre}pages.js"></script>
<script src="{pre}art.js"></script>
</body>
</html>
'''
    # Content is visible from the first paint: no scroll-triggered reveals.
    out = re.sub(r' data-sc-(?:in|stagger)(?:="[^"]*")?', '', out)
    dest = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(dest) or ROOT, exist_ok=True)
    vis = re.sub(r'<script.*?</script>', '', out, flags=re.S)
    assert '—' not in re.sub(r'<[^>]+>', '', vis), 'em dash in ' + path
    open(dest, 'w', encoding='utf8').write(out)
    return dest

def footer(pre):
    links = ''.join('<li><a href="%s%s">%s</a></li>' % (pre, h, t(en, vi)) for en, vi, h, _ in FOOT)
    return f'''<footer class="foot">
  <div class="ch__wrap foot__grid">
    <div class="foot__about">
      <p class="foot__brand"><span class="mast__tile mast__tile--sm"><img src="{pre}images/logo.png" alt="" width="698" height="427"></span>Interactive Robot Design Lab</p>
      <p>{t('Robot design, compliant actuation and physics-informed AI for safe physical human–robot interaction.', 'Thiết kế robot, truyền động đàn hồi và AI tích hợp vật lý cho tương tác vật lý người–robot an toàn.')}</p>
    </div>
    <div>
      <h2 class="foot__h">{t('Visit us', 'Địa chỉ')}</h2>
      <p>{t('Room H114, VinUniversity<br>Vinhomes Ocean Park, Gia Lam<br>Hanoi, Vietnam', 'Phòng H114, Trường Đại học VinUni<br>Vinhomes Ocean Park, Gia Lâm<br>Hà Nội, Việt Nam')}</p>
    </div>
    <div>
      <h2 class="foot__h">{t('Contact', 'Liên hệ')}</h2>
      <ul class="foot__list"><li><a href="mailto:linh.nv2@vinuni.edu.vn">linh.nv2@vinuni.edu.vn</a></li><li><a href="https://scholar.google.com/citations?user=d1J4vbsAAAAJ&amp;hl=en">Google Scholar</a></li><li><a href="https://github.com/IROD-Lab">GitHub</a></li></ul>
    </div>
    <div>
      <h2 class="foot__h">{t('Pages', 'Các trang')}</h2>
      <ul class="foot__list">{links}</ul>
    </div>
  </div>
  <div class="ch__wrap foot__base">© 2026 Interactive Robot Design Lab · VinUniversity</div>
</footer>'''

def head_block(label, h1, lede=None, meta=None, glyph=True):
    """label / h1 / lede / meta are already bilingual HTML (built with t())."""
    m = ''
    if meta:
        m = '<dl class="meta">' + ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (k, v) for k, v in meta) + '</dl>'
    g = ''  # the drafting glyph is retired: page heads are a plain title band
    l = '<p class="label">%s</p>' % label if label else ''
    ld = '<p class="phead__lede">%s</p>' % lede if lede else ''
    return f'''<section class="phead">
  <div class="ch__wrap phead__wrap">
    <div class="phead__text" data-sc-in data-sc-stagger="60">
      {l}
      <h1 class="phead__title">{h1}</h1>
      {ld}
    </div>
    {g}
  </div>
  <div class="ch__wrap">{m}</div>
</section>'''

GLYPH = '''<svg class="phead__glyph draw" viewBox="0 0 240 200" aria-hidden="true" focusable="false">
      <g class="cl"><line x1="70" y1="190" x2="70" y2="20"/><line x1="10" y1="150" x2="230" y2="150"/></g>
      <g class="ground"><line x1="44" y1="166" x2="96" y2="166"/><path d="M50 166l-8 10M62 166l-8 10M74 166l-8 10M86 166l-8 10M96 166l-8 10"/><path d="M70 150l-14 16h28z" class="fill-paper"/></g>
      <g class="spring"><polyline points="70,60 78,74 62,82 80,90 62,98 78,106 70,112"/></g>
      <g class="link"><line x1="70" y1="150" x2="200" y2="70"/></g>
      <g class="payload"><rect x="190" y="52" width="30" height="30" rx="2" transform="rotate(-31 205 67)"/></g>
      <g class="joint"><circle cx="70" cy="150" r="6"/><circle cx="70" cy="56" r="5"/><circle cx="135" cy="110" r="4"/></g>
    </svg>'''

# --------------------------------------------------------------- pages ----
def project_row(p, pre, full=False):
    href = '%scontent/research/featured/%s/index.html' % (pre, p['slug'])
    img = pre + p['img']
    def cut(s): return s[:230].rsplit(' ', 1)[0] + '…' if len(s) > 240 else s
    en, vi = p['text'], p['text_vi']
    summ = t(E(cut(en)), E(cut(vi)))
    cats = ' '.join(x.replace(' ', '-') for x in p['tags'])
    return f'''<li class="prow" data-cats="{cats}">
  <a class="prow__a" href="{href}">
    <span class="prow__fig"><img loading="lazy" src="{img}"{wh(p)} alt=""></span>
    <span class="prow__body">
      <span class="prow__meta"><span class="prow__year">{p['year']}</span><span class="prow__tags">{tags_t(p['tags'])}</span></span>
      <span class="prow__t">{t(E(p['title']), E(p['title_vi']))}</span>
      <span class="prow__s">{summ}</span>
    </span>
  </a>
</li>'''

CORE_AREAS = [
    ('Mechanically Intelligent Robot Design.',
     'Thiết kế robot thông minh cơ học.',
     'Compliant mechanisms, variable-stiffness structures, gravity compensation, and advanced robotic mechanisms.',
     'Cơ cấu đàn hồi, kết cấu độ cứng biến thiên, cân bằng trọng lực và các cơ cấu robot tiên tiến.'),
    ('Compliant Actuation and Physical Human–Robot Interaction.',
     'Truyền động đàn hồi và Tương tác vật lý người–robot.',
     'Compliant actuation, adaptive control, and safe physical interaction.',
     'Truyền động đàn hồi, điều khiển thích nghi và tương tác vật lý an toàn.'),
    ('Physics-Informed AI and Embodied Robotic Intelligence.',
     'AI tích hợp vật lý và Trí tuệ robot hiện thân.',
     'Physics-guided learning, intelligent control, and multimodal robot reasoning.',
     'Học máy định hướng vật lý, điều khiển thông minh và suy luận robot đa phương thức.'),
    ('Rehabilitation and Assistive Robotics',
     'Robot phục hồi chức năng và hỗ trợ',
     'Robotic exoskeletons, body-weight support systems, and intelligent rehabilitation.',
     'Robot khung xương ngoài, hệ thống nâng đỡ trọng lượng cơ thể và phục hồi chức năng thông minh.'),
    ('Intelligent Robotic Manipulation and Collaborative Manufacturing',
     'Thao tác robot thông minh và Sản xuất cộng tác',
     'Robot manipulators, mobile robotics, and human–robot collaborative manufacturing.',
     'Tay máy robot, robot di động và sản xuất cộng tác người–robot.'),
]

AREAS = []

def load_areas():
    """data/site/areas.json (editable in Pages CMS); falls back to CORE_AREAS."""
    try: raw = _load_json('site', 'areas.json').get('areas') or []
    except (OSError, ValueError, AttributeError): raw = []
    out = []
    for a in raw:
        if not isinstance(a, dict) or a.get('hidden'): continue
        en = str(a.get('title_en') or '').strip()
        slug = re.sub(r'[^a-z0-9-]+', '-', str(a.get('slug') or en).lower()).strip('-')
        if not en or not slug: continue
        out.append(dict(slug=slug, en=en, vi=str(a.get('title_vi') or '').strip() or en,
                        d_en=str(a.get('desc_en') or '').strip(), d_vi=str(a.get('desc_vi') or '').strip() or str(a.get('desc_en') or '').strip()))
    if not out:
        out = [dict(slug='area-%d' % (i + 1), en=a[0].rstrip('.'), vi=a[1].rstrip('.'), d_en=a[2], d_vi=a[3]) for i, a in enumerate(CORE_AREAS)]
    return out

def area_of(p):
    return next((a for a in AREAS if a['slug'] == p.get('area')), None)

def area_project(p, pre):
    href = '%scontent/research/featured/%s/index.html' % (pre, p['slug'])
    def cut(x): return x[:170].rsplit(' ', 1)[0] + '…' if len(x) > 180 else x
    return f'''<li class="rwork"><a href="{href}">
  <span class="rwork__meta"><span class="rwork__year">{p['year']}</span></span>
  <span class="rwork__t">{t(E(p['title']), E(p['title_vi']))}</span>
  <span class="rwork__fig"><img loading="lazy" src="{pre}{p['img']}"{wh(p)} alt="{E(p['alt'])}" data-alt-vi="{E(p['alt_vi'])}"></span>
  <span class="rwork__s">{t(E(cut(p['text'])), E(cut(p['text_vi'])))}</span>
  <span class="rwork__more">{t('Read more', 'Xem chi tiết')} <span aria-hidden="true">→</span></span>
</a></li>'''

# ------------------------------------------------------- research areas ----
# One line drawing per core area, same stroke style for all five (an area with no projects yet still
# needs a picture). .l = ink line, .a = accent line, .f = accent tint fill, .g = ground, .j = joint, .d = dimension.
_ART = {
 'mechanism-design': '''
  <g class="g"><path d="M70 150h180"/><path d="M80 150l-8 10M100 150l-8 10M120 150l-8 10M140 150l-8 10M160 150l-8 10M180 150l-8 10M200 150l-8 10M220 150l-8 10M240 150l-8 10"/></g>
  <path class="f" d="M96 150l-12 0 12-18 12 18zM216 150l-12 0 12-18 12 18z"/>
  <path class="l w" d="M96 132L120 62L214 52L216 132"/>
  <path class="a" d="M120 62L131 55L137 69L146 58L152 72L161 61L167 75L176 64L182 78L191 67L196 75"/>
  <path class="l" d="M214 52L262 34"/><rect class="f l" x="252" y="16" width="30" height="30" rx="3" transform="rotate(-20 267 31)"/>
  <circle class="j" cx="96" cy="132" r="6"/><circle class="j" cx="216" cy="132" r="6"/><circle class="j" cx="120" cy="62" r="5"/><circle class="j" cx="214" cy="52" r="5"/>
  <path class="d" d="M40 132a56 56 0 0 1 56-56"/><path class="d" d="M36 40v100"/>''',
 'physical-hri': '''
  <rect class="f l" x="34" y="66" width="46" height="46" rx="6"/><circle class="l" cx="57" cy="89" r="11"/><circle class="j" cx="57" cy="89" r="3"/>
  <path class="l" d="M80 89h14"/><path class="a w" d="M94 89l6-14 10 28 10-28 10 28 10-28 10 28 6-14"/><path class="l w" d="M156 89h34"/>
  <circle class="j" cx="196" cy="89" r="8"/>
  <circle class="f l" cx="262" cy="36" r="13"/>
  <path class="l w" d="M262 50v62M262 112l-16 42M262 112l16 42M262 70l-58 18M262 70l22 34"/>
  <path class="a" d="M214 62l-10 8 12 4M214 116l-10-8 12-4"/>
  <path class="g" d="M30 156h270"/>
  <path class="d" d="M34 132h112"/>''',
 'physics-informed-ai': '''
  <g class="l"><path d="M44 50L92 40M44 50L92 90M44 50L92 140M44 100L92 40M44 100L92 90M44 100L92 140M44 150L92 40M44 150L92 90M44 150L92 140M92 40L140 65M92 90L140 65M92 140L140 65M92 40L140 115M92 90L140 115M92 140L140 115"/></g>
  <g class="j"><circle cx="44" cy="50" r="7"/><circle cx="44" cy="100" r="7"/><circle cx="44" cy="150" r="7"/><circle cx="92" cy="40" r="7"/><circle cx="92" cy="90" r="7"/><circle cx="92" cy="140" r="7"/><circle cx="140" cy="65" r="7"/><circle cx="140" cy="115" r="7"/></g>
  <path class="a" d="M156 90h18M168 84l6 6-6 6"/>
  <path class="d" d="M186 150h104M186 150V30"/>
  <path class="a w" d="M186 90c10-56 18-56 26 0s16 40 24 0 14-26 20 0 10 16 16 0 8-8 18 0"/>
  <g class="dot"><circle cx="199" cy="52" r="3.5"/><circle cx="224" cy="122" r="3.5"/><circle cx="246" cy="70" r="3.5"/><circle cx="266" cy="104" r="3.5"/><circle cx="284" cy="86" r="3.5"/></g>''',
 'rehabilitation': '''
  <path class="g" d="M20 158h280"/>
  <path class="l" d="M40 14v50M40 64h70M48 64v94M104 64v94"/><rect class="f l" x="36" y="58" width="80" height="10" rx="4"/>
  <path class="l w" d="M84 54L196 70L176 150L222 154"/>
  <path class="a w" d="M90 68L196 84L182 150"/>
  <rect class="f l" x="124" y="56" width="26" height="22" rx="4" transform="rotate(8 137 67)"/><rect class="f l" x="168" y="108" width="26" height="22" rx="4" transform="rotate(-76 181 119)"/>
  <circle class="j" cx="196" cy="78" r="12"/><circle class="j" cx="196" cy="78" r="4"/>
  <path class="d" d="M226 54a36 36 0 0 1 0 50"/><path class="a" d="M221 100l5 4 3-6"/>''',
 'manipulation-manufacturing': '''
  <path class="l" d="M30 140h260M30 152h260"/><g class="j"><circle cx="50" cy="146" r="6"/><circle cx="110" cy="146" r="6"/><circle cx="170" cy="146" r="6"/><circle cx="230" cy="146" r="6"/><circle cx="270" cy="146" r="6"/></g>
  <rect class="f l" x="186" y="112" width="28" height="28" rx="2"/><rect class="f l" x="240" y="112" width="28" height="28" rx="2"/>
  <path class="f l" d="M70 140h40l-6-18H76z"/>
  <path class="l w" d="M90 122V96L140 52L190 78"/><path class="a w" d="M190 78v16"/>
  <path class="a" d="M182 94h16M182 94v10M198 94v10"/>
  <circle class="j" cx="90" cy="96" r="7"/><circle class="j" cx="140" cy="52" r="7"/><circle class="j" cx="190" cy="78" r="6"/>''',
}
_ART_DEFAULT = '<circle class="j" cx="160" cy="90" r="30"/><path class="a" d="M120 90h80"/>'

def area_art(slug, cls='art'):
    # art.js redraws known slugs as animated mechanisms; this static drawing is the no-JS fallback
    return '<svg class="%s" viewBox="0 0 320 180" data-art="%s" aria-hidden="true" focusable="false">%s</svg>' % (cls, E(slug), _ART.get(slug, _ART_DEFAULT))

def area_href(pre, a): return '%scontent/research/areas/%s/index.html' % (pre, a['slug'])
def area_projects(a): return [p for p in PROJECTS if p['area'] == a['slug']]
def area_count(n): return t('%d project%s' % (n, '' if n == 1 else 's'), '%d dự án' % n) if n else t('Coming soon', 'Sắp cập nhật')

def area_card(a, k, pre):
    """Illustrated card for one core area (homepage and Research page); opens the area's own page."""
    return f'''<li class="acard"><a href="{area_href(pre, a)}">
  <span class="acard__art">{area_art(a['slug'])}</span>
  <span class="acard__body">
    <span class="acard__n">{t('Area', 'Hướng')} {k + 1:02d}</span>
    <span class="acard__t">{t(E(a['en']), E(a['vi']))}</span>
    <span class="acard__d">{t(E(a['d_en']), E(a['d_vi']))}</span>
    <span class="acard__c">{area_count(len(area_projects(a)))} <span aria-hidden="true">→</span></span>
  </span>
</a></li>'''

def research_index(journals, confs, links):
    pre = '../../'
    cards = ''.join(area_card(a, k, pre) for k, a in enumerate(AREAS))
    rest = [p for p in PROJECTS if not area_of(p)]
    other = ''
    if rest:
        other = f'''
<section class="rarea"><div class="ch__wrap">
  <header class="rarea__head"><h2 class="rarea__t">{t('Other projects', 'Dự án khác')}</h2></header>
  <ul class="rgrid">{''.join(area_project(p, pre) for p in rest)}</ul>
</div></section>'''
    body = f'''<section class="rbanner">
  <img class="rbanner__img" src="{pre}images/robot.jpg" alt="Lab members working with robotic equipment at VinUniversity" data-alt-vi="Thành viên lab làm việc với thiết bị robot tại Trường Đại học VinUni" width="700" height="525">
  <div class="rbanner__in ch__wrap">
    <p class="rbanner__k">Interactive Robot Design Lab · VinUniversity</p>
    <h1 class="rbanner__t">{t('Research', 'Nghiên cứu')}</h1>
  </div>
</section>
<section class="rintro">
  <div class="ch__wrap rintro__wrap">
    <p class="rintro__lede">{t('The <em>Interactive Robot Design Lab</em> at VinUniversity conducts research in %d core areas, combining mechanically intelligent robot design with safe physical human–robot interaction and physics-informed AI.' % len(AREAS),
                               '<em>Interactive Robot Design Lab</em> tại Trường Đại học VinUni nghiên cứu %d hướng trọng tâm, kết hợp thiết kế robot thông minh cơ học với tương tác vật lý người–robot an toàn và AI tích hợp vật lý.' % len(AREAS))}</p>
    <p class="rintro__note">{t(f'Choose an area to see its projects. For papers, see the <a href="{pre}content/publications/index.html">Publications</a> page.',
                               f'Chọn một hướng để xem các dự án thuộc hướng đó. Danh sách bài báo xem tại trang <a href="{pre}content/publications/index.html">Công bố</a>.')}</p>
  </div>
</section>
<section class="hsec"><div class="ch__wrap">
  <h2 class="visually-hidden">{t('Core research areas', 'Các hướng nghiên cứu trọng tâm')}</h2>
  <ul class="agrid">{cards}</ul>
</div></section>{other}'''
    page('content/research/index.html', 'Research', 'Core research areas and projects of the Interactive Robot Design Lab at VinUniversity.',
         'Research', 'R', 'Research', body, title_vi='Nghiên cứu', sheet_vi='Nghiên cứu')

def area_pages():
    """One page per core area, holding only that area's projects, with a switcher to the other areas."""
    pre = '../../../../'
    for k, a in enumerate(AREAS):
        ps = area_projects(a)
        tabs = ''.join('<li><a href="%s"%s><span class="atab__n">%02d</span> %s</a></li>' % (
            area_href(pre, b), ' aria-current="page"' if b is a else '', j + 1, t(E(b['en']), E(b['vi']))) for j, b in enumerate(AREAS))
        if ps:
            items = '<ul class="rgrid">%s</ul>' % ''.join(area_project(p, pre) for p in ps)
        else:
            items = '<p class="rarea__empty">%s</p>' % t('Projects in this area are under way and will be published here.',
                                                         'Các dự án thuộc hướng này đang được triển khai và sẽ được đăng tại đây.')
        body = f'''<section class="ahead">
  <div class="ch__wrap ahead__wrap">
    <div class="ahead__text">
      <nav class="crumbs" aria-label="Breadcrumb" data-aria-vi="Đường dẫn"><a href="{pre}content/research/index.html">{t('Research', 'Nghiên cứu')}</a> <span aria-hidden="true">/</span> {t('Area %02d' % (k + 1), 'Hướng %02d' % (k + 1))}</nav>
      <h1 class="phead__title">{t(E(a['en']), E(a['vi']))}</h1>
      <p class="phead__lede">{t(E(a['d_en']), E(a['d_vi']))}</p>
      <p class="ahead__c">{area_count(len(ps))}</p>
    </div>
    <div class="ahead__art">{area_art(a['slug'])}</div>
  </div>
</section>
<nav class="atabs" aria-label="Research areas" data-aria-vi="Các hướng nghiên cứu"><div class="ch__wrap"><ul class="atabs__list">{tabs}</ul></div></nav>
<section class="rarea"><div class="ch__wrap">
  <h2 class="visually-hidden">{t('Projects', 'Dự án')}</h2>
  {items}
  <p class="links aback"><a href="{pre}content/research/index.html">{t('All research areas', 'Tất cả hướng nghiên cứu')}</a></p>
</div></section>'''
        page('content/research/areas/%s/index.html' % a['slug'], a['en'], a['d_en'] or a['en'], 'Research', 'R', 'Research', body,
             title_vi=a['vi'], sheet_vi='Nghiên cứu')

def publications_page(journals, confs, links):
    pre = '../../'
    body = head_block(t('Publications', 'Công bố'), t('What we have published.', 'Những gì lab đã công bố.'),
                      t(f'{len(journals)} journal articles and {len(confs)} conference papers, newest first. The live record is on <a href="https://scholar.google.com/citations?user=d1J4vbsAAAAJ&amp;hl=en">Google Scholar</a>.',
                        f'{len(journals)} bài báo tạp chí và {len(confs)} bài hội nghị, mới nhất trước. Danh mục cập nhật nhất có trên <a href="https://scholar.google.com/citations?user=d1J4vbsAAAAJ&amp;hl=en">Google Scholar</a>.'))
    body += f'''
<section class="psec" id="journals"><div class="ch__wrap">
  <h2 class="display display--sm">{t('Journal articles', 'Bài báo tạp chí')}</h2><p class="body small">{t('<sup>*</sup> Corresponding author.', '<sup>*</sup> Tác giả liên hệ.')}</p>{pub_list(journals, links)}
</div></section>
<section class="psec psec--alt" id="conferences"><div class="ch__wrap">
  <h2 class="display display--sm">{t('Conference papers', 'Bài báo hội nghị')}</h2>{pub_list(confs, links)}
</div></section>
<section class="psec" id="books"><div class="ch__wrap">
  <h2 class="display display--sm">{t('Books and chapters', 'Sách và chương sách')}</h2>
  <ol class="pubs__list" lang="en"><li><b>V. L. Nguyen</b>, P. D. Nguyen, N. Q. Hoang, G. Carbone. Robotics and Mechatronics: Proceedings of ISRM 2026. Mechanisms and Machine Science, 213, 2026.</li>
  <li><b>V.L. Nguyen</b> and C.-H. Kuo. A modularization approach for gravity compensation of planar articulated robotic manipulators. In <i>Gravity Compensation in Robotics</i>, ed. V. Arakelian, Springer Nature, Cham, Switzerland.</li></ol>
</div></section>'''
    page('content/publications/index.html', 'Publications', 'Journal articles, conference papers and book chapters of the Interactive Robot Design Lab at VinUniversity.',
         'Publications', 'B', 'Publications', body, title_vi='Công bố', sheet_vi='Công bố')

def pub_list(entries, links, cls='pubs'):
    by = {}
    order = []
    prev = ''
    for e in entries:
        y, h = pub_html(e, links)
        # The CV is newest-first; an entry with no year (in press, manuscript number) belongs with its neighbour.
        y = y or prev
        prev = y
        if y not in by: by[y] = []; order.append(y)
        by[y].append(h)
    out = '<div class="%s" lang="en">' % cls
    for y in order:
        out += '<section class="pubs__year"><h3 class="pubs__y">%s</h3><ol class="pubs__list">%s</ol></section>' % (E(y or 'Other'), ''.join('<li>%s</li>' % h for h in by[y]))
    return out + '</div>'

def project_pages():
    n = len(PROJECTS)
    for i, p in enumerate(PROJECTS):
        pre = '../../../../'
        path = 'content/research/featured/%s/index.html' % p['slug']
        refs = p['refs']
        refhtml = ''
        if refs:
            refhtml = '<section class="psec psec--refs"><div class="ch__wrap narrow"><h2 class="display display--sm">%s</h2><ol class="refs" lang="en">' % t('Publications', 'Công bố') + ''.join(
                '<li>%s%s</li>' % (E(x), (' <a class="pub__link" href="%s">Link</a>' % E(u)) if u else '') for x, u in refs) + '</ol></div></section>'
        prev = PROJECTS[i - 1] if i > 0 else None
        nxt = PROJECTS[i + 1] if i < n - 1 else None
        def pn(q, k):
            if not q: return '<span></span>'
            return '<a class="pn pn--%s" href="%scontent/research/featured/%s/index.html"><span class="pn__k">%s</span><span class="pn__t">%s</span></a>' % (
                k, pre, q['slug'], t('Newer', 'Mới hơn') if k == 'prev' else t('Older', 'Cũ hơn'), t(E(q['title']), E(q['title_vi'])))
        meta = [(t('Published', 'Ngày đăng'), t(E(p['date']), date_vi(p['date']))), (t('Year of work', 'Năm thực hiện'), E(str(p['year']))),
                (t('Research area', 'Hướng nghiên cứu'), ('<a href="%scontent/research/areas/%s/index.html">%s</a>' % (pre, area_of(p)['slug'], t(E(area_of(p)['en']), E(area_of(p)['vi'])))) if area_of(p) else tags_t(p['tags']))]
        body = head_block(t('Research project', 'Dự án nghiên cứu'), t(E(p['title']), E(p['title_vi'])), None, meta, glyph=False)
        body += f'''
<section class="psec psec--fig">
  <div class="ch__wrap">
    <figure class="pfig" data-sc-in>
      <div class="pfig__frame"><img src="{pre}{p['img']}"{wh(p)} alt="{E(p['alt'])}" data-alt-vi="{E(p['alt_vi'])}"></div>
      <figcaption class="reg__cap"><span class="reg__capk">{t('Fig.', 'Hình')}</span> {t(E(p['title']), E(p['title_vi']))}</figcaption>
    </figure>
  </div>
</section>
<section class="psec">
  <div class="ch__wrap narrow">
    <h2 class="display display--sm">{t('Summary', 'Tóm tắt')}</h2>
    <p class="body prose">{t(E(p['text']), E(p['text_vi']))}</p>
  </div>
</section>
{refhtml}
<nav class="psec pnav" aria-label="More projects" data-aria-vi="Dự án khác"><div class="ch__wrap pnav__wrap">{pn(prev, 'prev')}<a class="pn pn--all" href="{pre}content/research/index.html"><span class="pn__k">{t('Index', 'Danh mục')}</span><span class="pn__t">{t('All research', 'Tất cả nghiên cứu')}</span></a>{pn(nxt, 'next')}</div></nav>'''
        page(path, p['title'], p['text'][:155], 'Research', 'R%d' % (i + 1), 'Project', body, title_vi=p['title_vi'], sheet_vi='Dự án')

def news_page():
    pre = '../../'
    items = ''
    for d, kind, text, link in NEWS:
        more = (' <a href="%s%s">%s</a>' % (pre, link, t('Read more', 'Xem thêm'))) if link else ''
        items += f'<li class="nrow" data-kind="{kind.lower()}"><span class="nrow__d">{t(E(d), E(date_vi(d)))}</span><span class="nrow__k">{t(kind, KIND_VI[kind])}</span><p class="nrow__t">{t(text)}{more}</p></li>'
    body = head_block(t('Lab news', 'Tin tức'), t('Updates, awards and events.', 'Cập nhật, giải thưởng và sự kiện.'), t('What the lab has been doing, newest first.', 'Những việc lab đã làm, mới nhất trước.'))
    body += f'<section class="psec"><div class="ch__wrap"><ol class="nlist">{items}</ol></div></section>'
    page('content/news/index.html', 'Lab News', 'Latest updates, awards, grants and events from the Interactive Robot Design Lab.', 'News', 'N', 'News', body,
         title_vi='Tin tức', sheet_vi='Tin tức')

def person_card(p, pre, big=False):
    href = '%scontent/people/members/%s/index.html' % (pre, p['id'])
    img = ('<img loading="lazy" src="%scontent/people/members/%s/%s" alt="" width="400" height="500">' % (pre, p['id'], p['img'])) if p['img'] else '<span class="pcard__ph" aria-hidden="true"></span>'
    line = '<span class="pcard__line">%s</span>' % t(E(p['line'])) if p.get('line') else ''
    role = '<span class="pcard__role">%s</span>' % t(E(p['role']), E(ROLE_VI[p['role']])) if p.get('role') in ROLE_VI else ''
    if big: role = '<span class="pcard__role">%s</span>' % t('Principal investigator', 'Trưởng nhóm nghiên cứu')
    return f'<li class="pcard{" pcard--pi" if big else ""}"><a href="{href}"><span class="pcard__img">{img}</span>{role}<span class="pcard__name">{t(E(p["en"]), E(p["vi"]))}</span><span class="pcard__vi">{t(E(p["vi"]), E(p["en"]))}</span>{line}</a></li>'

def people_pages():
    pre = '../../'
    pi = PEOPLE[0]
    # One grid for everyone: the PI card spans several columns, every other card carries its role,
    # so a role with a single member no longer takes a whole row.
    members = [m for role, _ in ROLE_ORDER for m in PEOPLE if m['role'] == role]
    cards = person_card(pi, pre, True) + ''.join(person_card(m, pre) for m in members)
    body = head_block(t('People', 'Thành viên'), t('The team.', 'Đội ngũ.'), t('Students and researchers working with Dr. Nguyen Vu Linh at VinUniversity.', 'Sinh viên và nghiên cứu viên làm việc cùng TS. Nguyễn Vũ Linh tại Trường Đại học VinUni.'))
    body += f'''<section class="psec psec--team">
  <div class="ch__wrap">
    <h2 class="visually-hidden">{t('Members', 'Thành viên')}</h2>
    <ul class="pgrid pgrid--all">{cards}</ul>
    <p class="join">{t(f'Want to join? See the <a href="{pre}content/openings/index.html">Openings</a>.', f'Muốn tham gia? Xem mục <a href="{pre}content/openings/index.html">Tuyển dụng</a>.')}</p>
  </div>
</section>'''
    page('content/people/index.html', 'Our team', 'Members of the Interactive Robot Design Lab at VinUniversity.', 'People', 'P', 'People', body, title_vi='Thành viên', sheet_vi='Thành viên')
    for p in PEOPLE[1:] + UNLISTED:
        member_page(p)

def member_page(p):
    pre = '../../../../'
    img = ('<img src="%s" alt="Portrait of %s" data-alt-vi="Chân dung %s" width="400" height="500">' % (p['img'], E(p['en']), E(p['vi']))) if p['img'] else '<span class="pcard__ph" aria-hidden="true"></span>'
    role = '<p class="member__role">%s</p>' % t(E(p['role']), E(ROLE_VI[p['role']])) if p['role'] else ''
    body = f'''<section class="phead phead--member">
  <div class="ch__wrap member">
    <div class="member__img">{img}</div>
    <div class="member__text" data-sc-in data-sc-stagger="60">
      <p class="label">Interactive Robot Design Lab</p>
      <h1 class="phead__title">{t(E(p['en']), E(p['vi']))}</h1>
      <p class="member__vi">{t(E(p['vi']), E(p['en']))}</p>
      {role}
      <p class="links"><a href="{pre}content/people/index.html">{t('All people', 'Tất cả thành viên')}</a><a href="mailto:linh.nv2@vinuni.edu.vn">{t('Contact the lab', 'Liên hệ phòng lab')}</a></p>
    </div>
  </div>
</section>'''
    page('content/people/members/%s/index.html' % p['id'], p['en'], '%s, Interactive Robot Design Lab, VinUniversity.' % p['en'], 'People', 'P', p['en'], body,
         title_vi=p['vi'], sheet_vi=p['vi'])

def pi_page(journals, confs, links):
    pre = '../../../../'
    cv = _load_json('site', 'cv.json')
    grants, awards, service = cv['grants'], cv['awards'], cv['service']
    def strip_amt(x): return re.sub(r'\s*\((PI|co-PI|member)[^)]*\)', lambda m: ' (' + m.group(1) + ')', x).rstrip('.') + '.'
    def clean(x):
        x = re.sub(r'(\d|Now)\s*[–-]\s*(\d|Now)', r'\1 to \2', x)          # date ranges
        x = re.sub(r'^([A-Z][A-Za-z/ -]+?)\s*–\s+', r'\1: ', x)            # "General Chair– X" -> "General Chair: X"
        x = x.replace(' – ', ': ').replace('–', '-').replace('(Link)', '')
        return re.sub(r'\s{2,}', ' ', x).strip()
    def dd(d):
        d = clean(d)
        return t(E(d), E(d.replace(' to ', ' đến ').replace('Now', 'nay').replace('now', 'nay')))
    g = ''.join('<li><span class="dl__d">%s</span><span>%s</span></li>' % (dd(d), t(E(clean(strip_amt(x))))) for x, d in grants)
    a = ''.join('<li><span class="dl__d">%s</span><span>%s</span></li>' % (dd(d), t(E(clean(x)))) for x, d in awards)
    s = ''
    for ln in service:
        ln = re.sub(r'\s{2,}https?://\S+', '', ln)
        if re.match(r'^\s*[^\w(]', ln):
            s += '<li class="sv__sub">%s</li>' % t(E(clean(re.sub(r'^\s*[^\w(]+\s*', '', ln))))
        else:
            s += '<li>%s</li>' % t(E(clean(ln).replace('– ', ': ', 1)))
    pubs_j = pub_list(journals, links)
    pubs_c = pub_list(confs, links)
    def row(d, en): return '<li><span class="dl__d">%s</span><span>%s</span></li>' % (dd(d), t(en))
    meta = [(t('Position', 'Chức vụ'), t('Assistant Professor &amp; Associate Program Director of Mechanical Engineering')),
            (t('College', 'Viện'), t('Engineering and Computer Science, VinUniversity')),
            ('Email', '<a href="mailto:linh.nv2@vinuni.edu.vn">linh.nv2@vinuni.edu.vn</a>'),
            (t('Profiles', 'Hồ sơ'), '<a href="https://scholar.google.com/citations?user=d1J4vbsAAAAJ&amp;hl=en">Google Scholar</a> · <a href="https://vinuni.edu.vn/people/nguyen-vu-linh-phd/">%s</a>' % t('VinUni profile', 'Hồ sơ VinUni'))]
    bio = "Dr. Nguyen Vu Linh&#x27;s research interests are the design of mechanical and robotic systems for energy savings, and mechanism and machine theory, with a focus on the design, modeling, control and development of intelligent means, reconfigurable mechanisms, compliant robots, flexible and lightweight wearable devices, and human-robot co-existence with safe physical interaction. The research is applied to industrial robots, surgical robots, assistive devices, robotic grippers, vibration isolators and renewable energy harvesting systems."
    body = f'''<section class="phead phead--member">
  <div class="ch__wrap member">
    <div class="member__img"><img src="linh.avif" alt="Portrait of Dr. Nguyen Vu Linh" data-alt-vi="Chân dung TS. Nguyễn Vũ Linh" width="400" height="500"></div>
    <div class="member__text" data-sc-in data-sc-stagger="60">
      <p class="label">{t('Principal investigator', 'Trưởng nhóm nghiên cứu')}</p>
      <h1 class="phead__title">{t('Nguyen Vu Linh', 'Nguyễn Vũ Linh')}</h1>
      <p class="member__vi">{t('Nguyễn Vũ Linh', 'Nguyen Vu Linh')}</p>
      <p class="body">{t(bio)}</p>
    </div>
  </div>
  <div class="ch__wrap"><dl class="meta">{''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (k, v) for k, v in meta)}</dl></div>
</section>
<nav class="toc ch__wrap" aria-label="On this page" data-aria-vi="Trong trang này"><a href="#career">{t('Career', 'Sự nghiệp')}</a><a href="#grants">{t('Grants', 'Đề tài')}</a><a href="#awards">{t('Awards', 'Giải thưởng')}</a><a href="#service">{t('Service', 'Hoạt động chuyên môn')}</a><a href="#teaching">{t('Teaching', 'Giảng dạy')}</a><a href="#publications">{t('Publications', 'Công bố')}</a></nav>
<section class="psec" id="career">
  <div class="ch__wrap cols">
    <div><h2 class="display display--sm">{t('Career', 'Sự nghiệp')}</h2>
      <ul class="dl">
        {row('2023 to now', 'Assistant Professor; Associate Program Director of Mechanical Engineering, College of Engineering and Computer Science, VinUniversity, Vietnam.')}
        {row('2021 to 2023', 'Assistant Professor of Mechanical Engineering, National Chin-Yi University of Technology, Taiwan.')}
        {row('2020 to 2021', 'Postdoctoral Fellow (MOST), National Taiwan University of Science and Technology, Taiwan.')}
        {row('2013 to 2015', 'CAD-CAM Engineer, Framas Vietnam Co. Ltd, Vietnam.')}
      </ul></div>
    <div><h2 class="display display--sm">{t('Education', 'Học vấn')}</h2>
      <ul class="dl">
        {row('2020', 'PhD in Mechanical Engineering, National Taiwan University of Science and Technology, Taiwan.')}
        {row('2017', 'Master in Mechanical Engineering, National Central University, Taiwan.')}
        {row('2013', 'B.Eng. in Automation Technology, HCMC University of Technology and Education, Vietnam.')}
      </ul>
      <h3 class="sub3">{t('Skills', 'Kỹ năng')}</h3><p class="body small">Solidworks, Creo (Pro-E), PowerShape, PowerMill, MSC Adams, Matlab/Simulink, Mathematica, C++.</p></div>
  </div>
</section>
<section class="psec psec--alt" id="grants"><div class="ch__wrap"><h2 class="display display--sm">{t('Research grants', 'Đề tài nghiên cứu')}</h2><ul class="dl">{g}</ul></div></section>
<section class="psec" id="awards"><div class="ch__wrap"><h2 class="display display--sm">{t('Awards', 'Giải thưởng')}</h2><ul class="dl">{a}</ul></div></section>
<section class="psec psec--alt" id="service"><div class="ch__wrap"><h2 class="display display--sm">{t('Service', 'Hoạt động chuyên môn')}</h2><ul class="sv">{s}</ul></div></section>
<section class="psec" id="teaching"><div class="ch__wrap narrow"><h2 class="display display--sm">{t('Teaching (in English)', 'Giảng dạy (bằng tiếng Anh)')}</h2>
  <p class="body">{t('<b>Graduate:</b> Robotics; Analysis and Simulation of Dynamic Systems; Precision Manufacturing.')}</p>
  <p class="body">{t('<b>Undergraduate:</b> Calculus; Statics; Thermodynamics; Sensors and Actuators; Mechatronics; System Dynamics and Control; Control System Theory and Design; Robotics and Automation; Mechanical Synthesis.')}</p></div></section>
<section class="psec psec--alt" id="publications"><div class="ch__wrap">
  <h2 class="display display--sm">{t('Journal articles', 'Bài báo tạp chí')}</h2><p class="body small">{t(f'{len(journals)} articles. <sup>*</sup> Corresponding author.', f'{len(journals)} bài báo. <sup>*</sup> Tác giả liên hệ.')}</p>{pubs_j}
  <h2 class="display display--sm pubs__h2">{t('Conference papers', 'Bài báo hội nghị')}</h2>{pubs_c}
  <h2 class="display display--sm pubs__h2">{t('Books and chapters', 'Sách và chương sách')}</h2>
  <ol class="pubs__list" lang="en"><li><b>V. L. Nguyen</b>, P. D. Nguyen, N. Q. Hoang, G. Carbone. Robotics and Mechatronics: Proceedings of ISRM 2026. Mechanisms and Machine Science, 213, 2026.</li>
  <li><b>V.L. Nguyen</b> and C.-H. Kuo. A modularization approach for gravity compensation of planar articulated robotic manipulators. In <i>Gravity Compensation in Robotics</i>, ed. V. Arakelian, Springer Nature, Cham, Switzerland.</li></ol>
</div></section>'''
    page('content/people/members/linh.nv/index.html', 'Nguyen Vu Linh', 'Dr. Nguyen Vu Linh, Assistant Professor and Associate Program Director of Mechanical Engineering, VinUniversity.',
         'People', 'P1', 'Nguyen Vu Linh', body, title_vi='Nguyễn Vũ Linh', sheet_vi='Nguyễn Vũ Linh')

def _unused_cv_pairs(start, stop):
    ls = cv_section(start, lambda l: l.startswith(stop))
    out = []
    i = 0
    while i < len(ls):
        x = ls[i]
        d = ls[i + 1] if i + 1 < len(ls) and re.match(r'^[\d/–\-\s]+(Now)?$', ls[i + 1]) else ''
        out.append((x, d)); i += 2 if d else 1
    return out

def openings_pages():
    pre = '../../'
    body = head_block(t('Openings', 'Tuyển dụng'), t('Join IRoD Lab', 'Tham gia IRoD Lab'),
                      t('The Interactive Robot Design (IRoD) Lab at VinUniversity, Hanoi, Vietnam, welcomes motivated students and researchers interested in advancing intelligent and interactive robotic systems.',
                        'Phòng thí nghiệm Thiết kế Robot Tương tác (IRoD Lab) tại Trường Đại học VinUni, Hà Nội, Việt Nam chào đón các sinh viên và nhà nghiên cứu nhiệt huyết quan tâm đến việc phát triển các hệ thống robot thông minh và tương tác.'))
    areas = [
        ('<strong>Mechanically Intelligent Robot Design:</strong> Compliant mechanisms, variable-stiffness structures, gravity compensation, and advanced robotic mechanisms.',
         '<strong>Thiết kế robot thông minh cơ học:</strong> Cơ cấu đàn hồi, kết cấu độ cứng biến thiên, cân bằng trọng lực và các cơ cấu robot tiên tiến.'),
        ('<strong>Physical Human–Robot Interaction:</strong> Compliant actuation, adaptive control, and safe physical interaction.',
         '<strong>Tương tác vật lý người–robot:</strong> Truyền động đàn hồi, điều khiển thích nghi và tương tác vật lý an toàn.'),
        ('<strong>Physics-Informed AI and Embodied Intelligence:</strong> Physics-guided learning, intelligent control, and multimodal robot reasoning.',
         '<strong>AI tích hợp vật lý và Trí tuệ hiện thân:</strong> Học máy định hướng vật lý, điều khiển thông minh và suy luận robot đa phương thức.'),
        ('<strong>Rehabilitation and Assistive Robotics:</strong> Robotic exoskeletons, body-weight support systems, and intelligent rehabilitation.',
         '<strong>Robot phục hồi chức năng và hỗ trợ:</strong> Robot khung xương ngoài, hệ thống nâng đỡ trọng lượng cơ thể và phục hồi chức năng thông minh.'),
        ('<strong>Intelligent Robotic Manipulation:</strong> Robot manipulators, mobile robotics, and human–robot collaborative manufacturing.',
         '<strong>Thao tác robot thông minh:</strong> Tay máy robot, robot di động và sản xuất cộng tác người–robot.'),
    ]
    body += f'''<section class="psec">
  <div class="ch__wrap narrow prose-block">
    <p class="body">{t("We invite applications from Research Assistants, Master&#x27;s students, PhD students, and Postdoctoral Researchers in the following research areas:",
                       "Chúng tôi mời ứng tuyển cho các vị trí Trợ lý nghiên cứu, Học viên cao học, Nghiên cứu sinh Tiến sĩ và Nghiên cứu viên Sau tiến sĩ trong các hướng nghiên cứu sau:")}</p>
    <ul class="ticks">{''.join('<li>%s</li>' % t(a, b) for a, b in areas)}</ul>
    <h2 class="display display--sm">{t('Why Join Us?', 'Tại sao nên tham gia cùng chúng tôi?')}</h2>
    <p class="body">{t('IRoD Lab offers opportunities to conduct cutting-edge research, develop robotic prototypes, collaborate with international researchers, and publish in leading journals and conferences. Funded positions may be available depending on qualifications and project funding.',
                       'IRoD Lab mang đến cơ hội thực hiện các nghiên cứu tiên tiến, phát triển nguyên mẫu robot, hợp tác với các nhà nghiên cứu quốc tế và công bố trên các tạp chí, hội nghị hàng đầu. Các vị trí có hỗ trợ kinh phí sẽ được xem xét tùy theo năng lực ứng viên và nguồn kinh phí dự án.')}</p>
    <h2 class="display display--sm">{t('How to Apply', 'Cách thức ứng tuyển')}</h2>
    <p class="body">{t('Interested candidates should send their CV, academic transcripts, and a brief statement of research interests to:',
                       'Ứng viên quan tâm vui lòng gửi CV, bảng điểm học tập và bản trình bày ngắn gọn về định hướng nghiên cứu tới:')}</p>
    <p class="body">{t('<strong>Dr. Nguyen Vu Linh</strong><br>Director, Interactive Robot Design Lab<br>VinUniversity, Hanoi, Vietnam',
                       '<strong>TS. Nguyễn Vũ Linh</strong><br>Giám đốc, Interactive Robot Design Lab<br>Trường Đại học VinUni, Hà Nội, Việt Nam')}</p>
    <p class="body">{t('Email: <a href="mailto:linh.nv2@vinuni.edu.vn">linh.nv2@vinuni.edu.vn</a>',
                       'Email: <a href="mailto:linh.nv2@vinuni.edu.vn">linh.nv2@vinuni.edu.vn</a>')}</p>
    <p class="body">{t('Subject: Application to IRoD Lab – [Position] – [Your Name]',
                       'Tiêu đề: Application to IRoD Lab – [Position] – [Your Name]')}</p>
    <p class="body">{t('We welcome inquiries from talented and enthusiastic researchers throughout the year.',
                       'Chúng tôi chào đón thư trao đổi từ các nhà nghiên cứu tài năng và nhiệt huyết trong suốt cả năm.')}</p>
  </div>
</section>'''
    page('content/openings/index.html', 'Join IRoD Lab', 'Research Assistant, Master, PhD and Postdoc openings at the Interactive Robot Design Lab, VinUniversity.', 'Openings', 'O', 'Openings', body,
         title_vi='Tham gia IRoD Lab', sheet_vi='Tuyển dụng')

    MAIL = '<a href="mailto:linh.nv2@vinuni.edu.vn">linh.nv2@vinuni.edu.vn</a>'
    for slug, kind, kind_vi in [('vishc_phd_2025', 'PhD', 'Tiến sĩ'), ('vishc_postdocs_2025', 'Postdoc', 'Sau tiến sĩ')]:
        od = _load_json('site', 'openings.json')[slug]
        title = od['title']
        out, in_list = '', False
        for tag, txt in od['blocks']:
            if not txt or txt in ('Back to top',): continue
            tx = t(E(txt)).replace('linh.nv2@vinuni.edu.vn', MAIL)
            if tag == 'li':
                if not in_list: out += '<ul class="ticks">'; in_list = True
                out += '<li>%s</li>' % tx
                continue
            if in_list: out += '</ul>'; in_list = False
            if tag.startswith('h'): out += '<h2 class="display display--sm">%s</h2>' % tx
            else: out += '<p class="body">%s</p>' % tx
        if in_list: out += '</ul>'
        meta = [(t('Published', 'Ngày đăng'), t('November 20, 2025', '20/11/2025')), (t('Position', 'Vị trí'), t(kind, kind_vi)),
                (t('Partner', 'Đối tác'), t('University of Illinois at Urbana-Champaign (UIUC)', 'Đại học Illinois Urbana-Champaign (UIUC)')), (t('Apply to', 'Nộp hồ sơ'), MAIL)]
        h1 = E(title.replace(' | ', ': '))
        body = head_block(t('Open position', 'Vị trí đang tuyển'), t(h1), None, meta, glyph=False)
        body += '<section class="psec"><div class="ch__wrap narrow prose-block">%s<p class="links"><a href="../../index.html">%s</a></p></div></section>' % (out, t('All openings', 'Tất cả vị trí'))
        page('content/openings/positions/%s/index.html' % slug, title, title, 'Openings', 'O', kind + ' position', body,
             title_vi=plain_vi(h1), sheet_vi='Vị trí ' + kind_vi)

def home_page(journals, confs):
    """Homepage after robotics.sites.tau.ac.il: a full-width lab photo with a white introduction card on it,
    then key figures, research areas (each opens its own page of projects), news and a call to join. Generated like every subpage."""
    pre = ''
    def arrow(en, vi, href, cls='more'):
        return '<a class="%s" href="%s">%s <span aria-hidden="true">→</span></a>' % (cls, href, t(en, vi))
    stats = [(len(journals), 'Journal articles', 'Bài báo tạp chí'), (len(confs), 'Conference papers', 'Bài báo hội nghị'),
             (len(PROJECTS), 'Research projects', 'Dự án nghiên cứu'), (len(PEOPLE), 'Team members', 'Thành viên')]
    stat_html = ''.join('<li><span class="stat__n">%d</span><span class="stat__k">%s</span></li>' % (n, t(en, vi)) for n, en, vi in stats)
    area_html = ''.join(area_card(a, k, '') for k, a in enumerate(AREAS))
    news_html = ''
    for d, kind, text, link in NEWS[:6]:
        more = (' <a href="%s">%s</a>' % (link, t('Read more', 'Xem thêm'))) if link else ''
        news_html += f'<li class="nrow" data-kind="{kind.lower()}"><span class="nrow__d">{t(E(d), E(date_vi(d)))}</span><span class="nrow__k">{t(kind, KIND_VI[kind])}</span><p class="nrow__t">{t(text)}{more}</p></li>'
    body = f'''<section class="hero" aria-labelledby="hero-t">
  <img class="hero__img" src="images/robot.jpg" alt="" width="700" height="525">
  <div class="ch__wrap hero__wrap">
    <div class="hero__card">
      <p class="eyebrow">{t('VinUniversity · Hanoi, Vietnam', 'Trường Đại học VinUni · Hà Nội, Việt Nam')}</p>
      <h1 class="hero__t" id="hero-t">{t('The Interactive Robot Design Lab', 'Phòng thí nghiệm Thiết kế Robot Tương tác')}</h1>
      <p class="hero__p">{t('IRoD Lab studies advanced mechanism design, compliant actuation, and physics-informed AI to enable safer, more adaptive, and energy-efficient physical interactions between robots and humans. We apply this research to rehabilitation exoskeletons, body-weight support systems, surgical and service robots, and collaborative manufacturing.',
                           'IRoD Lab nghiên cứu thiết kế cơ cấu tiên tiến, truyền động đàn hồi và AI tích hợp vật lý nhằm mang lại sự tương tác vật lý an toàn, thích nghi và tiết kiệm năng lượng hơn giữa robot và con người. Chúng tôi ứng dụng các nghiên cứu này vào robot khung xương ngoài phục hồi chức năng, hệ thống nâng đỡ trọng lượng cơ thể, robot y tế, robot dịch vụ và sản xuất cộng tác.')}</p>
      <p class="hero__by">{t('Led by <a href="content/people/members/linh.nv/index.html">Dr. Nguyen Vu Linh</a>, College of Engineering and Computer Science.', 'Trưởng lab: <a href="content/people/members/linh.nv/index.html">TS. Nguyễn Vũ Linh</a>, Viện Kỹ thuật và Khoa học Máy tính.')}</p>
      <div class="btns"><a class="btn-p" href="content/research/index.html">{t('Explore our research', 'Xem nghiên cứu')}</a><a class="btn-s" href="content/people/index.html">{t('Meet the team', 'Đội ngũ thành viên')}</a></div>
    </div>
  </div>
</section>
<section class="stats" aria-label="Lab at a glance" data-aria-vi="Tổng quan về lab"><div class="ch__wrap"><ul class="stats__list">{stat_html}</ul></div></section>
<section class="hsec" aria-labelledby="areas-h">
  <div class="ch__wrap">
    <header class="hsec__head"><div><p class="eyebrow">{t('Research', 'Nghiên cứu')}</p><h2 class="hsec__t" id="areas-h">{t('Core research areas', 'Các hướng nghiên cứu trọng tâm')}</h2></div>{arrow('All research', 'Tất cả nghiên cứu', 'content/research/index.html')}</header>
    <ul class="agrid">{area_html}</ul>
  </div>
</section>
<section class="hsec" aria-labelledby="news-h">
  <div class="ch__wrap">
    <header class="hsec__head"><div><p class="eyebrow">{t('News', 'Tin tức')}</p><h2 class="hsec__t" id="news-h">{t('Latest news', 'Tin mới')}</h2></div>{arrow('All news', 'Tất cả tin tức', 'content/news/index.html')}</header>
    <ol class="nlist">{news_html}</ol>
  </div>
</section>
<section class="cta" aria-labelledby="cta-h">
  <div class="ch__wrap cta__in">
    <div><h2 class="cta__t" id="cta-h">{t('Join IRoD Lab', 'Tham gia IRoD Lab')}</h2>
    <p>{t('We welcome research assistants, master’s and PhD students, and postdoctoral researchers throughout the year.', 'Chúng tôi chào đón trợ lý nghiên cứu, học viên cao học, nghiên cứu sinh và nghiên cứu viên sau tiến sĩ trong suốt cả năm.')}</p></div>
    <a class="btn-w" href="content/openings/index.html">{t('See open positions', 'Xem vị trí tuyển dụng')}</a>
  </div>
</section>'''
    page('index.html', 'Interactive Robot Design Lab · VinUniversity',
         'The Interactive Robot Design (IRoD) Lab at VinUniversity designs compliant, reconfigurable and gravity-balanced mechanisms for safer human-robot interaction.',
         'Home', 'H', 'Home', body, title_vi='Interactive Robot Design Lab · Trường Đại học VinUni', home=True)

def main():
    PROJECTS[:] = load_projects()
    AREAS[:] = load_areas()
    cv = _load_json('site', 'cv.json')
    journals, confs = cv['journals'], cv['conferences']
    links = [tuple(x) for x in cv['pub_links']]
    research_index(journals, confs, links)
    area_pages()
    publications_page(journals, confs, links)
    project_pages()
    news_page()
    people_pages()
    pi_page(journals, confs, links)
    openings_pages()
    home_page(journals, confs)
    # projects removed or hidden in the CMS: drop their old page (images stay where they are)
    feat = os.path.join(ROOT, 'content', 'research', 'featured')
    live = set(p['slug'] for p in PROJECTS)
    for d in os.listdir(feat):
        f = os.path.join(feat, d, 'index.html')
        if d not in live and os.path.exists(f):
            os.remove(f)
            print('removed stale page', d)
            if not os.listdir(os.path.join(feat, d)): os.rmdir(os.path.join(feat, d))
    adir = os.path.join(ROOT, 'content', 'research', 'areas')
    live_a = set(a['slug'] for a in AREAS)
    for d in (os.listdir(adir) if os.path.isdir(adir) else []):
        f = os.path.join(adir, d, 'index.html')
        if d not in live_a and os.path.exists(f):
            os.remove(f)
            print('removed stale area page', d)
            if not os.listdir(os.path.join(adir, d)): os.rmdir(os.path.join(adir, d))
    todo = os.path.join(ROOT, 'tools', 'vi_todo.json')
    json.dump(TODO, open(todo, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('journals', len(journals), 'conferences', len(confs), 'links', len(links), 'untranslated', len(TODO))

main()
