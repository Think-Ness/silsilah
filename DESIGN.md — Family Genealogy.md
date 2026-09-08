# DESIGN.md — Family Genealogy

## 1. Design Direction

Design direction:

**Quiet, editorial, archival, professional.**

Aplikasi harus terasa seperti sebuah **arsip keluarga digital**, bukan website startup.

Prinsip:

> Content is the interface.

Data keluarga harus menjadi pusat perhatian.

---

# 2. Visual Character

Gunakan:

- neutral background
- dark text
- subtle borders
- restrained accent color
- generous whitespace
- clean typography
- small radius
- subtle shadows

Hindari:

- gradient background
- glassmorphism
- excessive rounded cards
- neon colors
- excessive shadows
- decorative blobs
- floating decorative shapes
- emoji sebagai icon UI
- excessive animations
- oversized headings
- AI-style dashboard cards

---

# 3. Color System

Gunakan warna netral.

Base:

```text
Background:
#FAFAF9

Surface:
#FFFFFF

Foreground:
#18181B

Muted:
#71717A

Border:
#E4E4E7

Subtle:
#F4F4F5
```

Accent gunakan satu warna saja.

Accent dapat berupa warna heritage yang tenang, misalnya:

```text
#6B6257
```

Jangan menggunakan banyak accent colors.

Status colors hanya digunakan bila memang diperlukan:

- success
- warning
- error

---

# 4. Typography

Gunakan font sans-serif modern.

Recommended:

```text
Inter
```

atau system font stack.

Hierarchy:

```text
Display
32–40px

Page Heading
24–28px

Section Heading
18–20px

Body
14–16px

Metadata
12–13px
```

Jangan menggunakan terlalu banyak font family.

---

# 5. Border Radius

Gunakan radius secara restrained.

```text
Small:
6px

Medium:
8px

Large:
10px
```

Jangan membuat semua elemen berbentuk pill.

Pill hanya untuk:

- status
- tag
- filter
- compact metadata

---

# 6. Shadows

Default:

```text
box-shadow: none
```

Gunakan border sebagai primary separation.

Shadow hanya untuk:

- dropdown
- popover
- modal
- floating panel
- bottom sheet

Shadow harus sangat subtle.

---

# 7. Layout

Desktop:

```text
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├───────────────┬─────────────────────────────────────────┤
│ Sidebar       │                                         │
│               │              Main Content               │
│ Navigation    │                                         │
│               │                                         │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

Sidebar:

```text
240px
```

Main:

```text
flex: 1
```

---

# 8. Header

Header sederhana.

```text
Family Genealogy

                     Search      User
```

Jangan menggunakan hero banner.

---

# 9. Sidebar

Navigation:

```text
Overview

Family Tree
People
Relationships

Archive
Photos
Documents

Administration
Users
Audit Log
Settings
```

Gunakan Lucide icons.

Icon tidak boleh menggantikan label pada primary navigation desktop.

---

# 10. Canvas UI

Canvas adalah primary interface.

Background:

```text
#FAFAF9
```

Node menggunakan surface putih.

Node:

```text
┌──────────────────────────┐
│                          │
│  [PHOTO]                 │
│                          │
│  H. Misbahul Khair       │
│  + Hj. Laela Wahyuni     │
│                          │
└──────────────────────────┘
```

Gunakan border.

Tidak menggunakan gradient.

Tidak menggunakan excessive shadow.

---

# 11. Person Node

Desktop size:

```text
220–260px
```

Mobile canvas node:

```text
180–220px
```

Person node hierarchy:

```text
Photo
Name
Spouse / relationship summary
Optional status
```

Nama menjadi informasi paling dominan.

---

# 12. Relationship Lines

Gunakan garis sederhana.

Parent-child:

```text
solid line
```

Unknown/uncertain relationship:

```text
dashed line
```

Relationship type jangan hanya dibedakan dengan warna.

Gunakan visual semantics:

```text
solid
dashed
```

bila diperlukan.

---

# 13. Couple Representation

Pasangan dapat divisualisasikan sebagai satu family unit.

Contoh:

```text
┌──────────────┐      ┌──────────────┐
│ Ahlan        │──────│ Siti Maskah  │
└──────────────┘      └──────────────┘
          │
          │
       Children
```

Jangan membuat node pasangan terlalu kompleks.

---

# 14. Canvas Controls

Control bar berada di bawah atau sudut canvas.

```text
−   +   Fit   Auto Layout   Fullscreen
```

Pada mobile:

```text
−
+
Fit
```

Additional actions dapat berada pada overflow menu.

---

# 15. Search

Search berada di header.

Desktop:

```text
┌───────────────────────────────────┐
│ Search family member...       ⌕  │
└───────────────────────────────────┘
```

Mobile:

gunakan dedicated search page/modal.

Search result:

```text
[photo] H. Misbahul Khair
        Family Branch · Ahlan
```

---

# 16. Person Detail Panel

Desktop:

```text
┌───────────────────────────────┐
│ Profile                   ×   │
├───────────────────────────────┤
│                               │
│          [PHOTO]              │
│                               │
│ H. Misbahul Khair             │
│ Laki-laki                     │
│                               │
│ ───────────────────────────   │
│                               │
│ Parents                       │
│ Ahlan + Siti Maskah           │
│                               │
│ Spouse                        │
│ Hj. Laela Wahyuni             │
│                               │
│ Children                      │
│ 4 children                    │
│                               │
│ Location                      │
│ Ponorogo                      │
│                               │
│ Contact                       │
│ • WhatsApp                    │
│                               │
├───────────────────────────────┤
│ View full profile             │
└───────────────────────────────┘
```

Panel width:

```text
360–420px
```

---

# 17. Mobile Person Detail

Gunakan bottom sheet.

```text
────────────────────────────
       drag indicator

[PHOTO]

H. Misbahul Khair
Laki-laki

Parents
Ahlan + Siti Maskah

Spouse
Hj. Laela Wahyuni

Children
4

[View Profile]
────────────────────────────
```

Bottom sheet dapat diperluas menjadi full screen.

---

# 18. Full Person Profile

Full profile menggunakan editorial layout.

```text
┌─────────────────────────────────────┐
│ ← Back                              │
│                                     │
│ [Large Portrait]                    │
│                                     │
│ H. Misbahul Khair                   │
│                                     │
│ Family information                  │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ Biography                           │
│                                     │
│ Family                              │
│                                     │
│ Contact                             │
│                                     │
│ Addresses                           │
│                                     │
│ Photos                              │
└─────────────────────────────────────┘
```

---

# 19. People Table

Desktop table:

```text
Photo | Name | Gender | Status | Location | Updated
```

Row height:

```text
64px
```

Mobile:

ubah menjadi compact list:

```text
┌──────────────────────────────┐
│ [photo] H. Misbahul Khair    │
│        Laki-laki · Ponorogo  │
└──────────────────────────────┘
```

Jangan memaksa table horizontal pada mobile.

---

# 20. Forms

Form harus menggunakan section.

Contoh:

```text
Personal Information
────────────────────────────────

Full Name
[____________________________]

Display Name
[____________________________]

Gender
[____________________________]


Birth Information
────────────────────────────────

Birth Date
[____________________________]

Birth Place
[____________________________]
```

Gunakan label di atas input.

Jangan mengandalkan placeholder sebagai label.

---

# 21. Buttons

Primary:

```text
Save Person
```

Secondary:

```text
Cancel
```

Destructive:

```text
Archive Person
```

Gunakan button hierarchy.

Jangan membuat semua button terlihat primary.

---

# 22. Empty States

Jangan menggunakan ilustrasi besar.

Contoh:

```text
No family members yet

Start documenting your family by adding
the first person.

[Add Person]
```

Simple dan informatif.

---

# 23. Loading States

Gunakan skeleton.

Hindari spinner besar di tengah halaman kecuali operasi memang global.

Canvas:

gunakan placeholder node/skeleton jika diperlukan.

---

# 24. Error States

Contoh:

```text
Something went wrong

We couldn't load this family branch.

[Try Again]
```

Jangan menampilkan technical error kepada user.

Technical details dapat masuk console/log.

---

# 25. Modal

Modal sederhana.

```text
┌───────────────────────────────┐
│ Archive Person            ×   │
│                               │
│ Are you sure you want to      │
│ archive this person?          │
│                               │
│ Cancel          Archive       │
└───────────────────────────────┘
```

Tidak menggunakan oversized modal.

---

# 26. Responsive Breakpoints

Gunakan:

```text
sm
md
lg
xl
2xl
```

Target:

```text
Mobile
< 768px

Tablet
768–1023px

Desktop
1024px+
```

---

# 27. Mobile Navigation

Desktop:

```text
Sidebar
```

Mobile:

```text
Bottom navigation
```

Primary:

```text
Tree
People
Search
Archive
More
```

Navigation harus memiliki:

- active state
- accessible labels
- 44px minimum touch area

---

# 28. Canvas Mobile Interaction

Wajib mendukung:

- one finger pan
- pinch zoom
- tap node
- tap relationship
- fit view
- focus selected person

Jangan mengandalkan hover.

Semua informasi penting yang tersedia melalui hover desktop harus memiliki alternatif tap pada mobile.

---

# 29. Animation

Animation harus subtle.

Allowed:

- panel transition
- bottom sheet transition
- node selection
- modal transition
- search result transition

Duration:

```text
150–250ms
```

Avoid:

- bouncing
- floating
- excessive parallax
- animated gradients
- perpetual animations

---

# 30. Accessibility

Wajib:

- semantic HTML
- keyboard navigation
- visible focus state
- sufficient contrast
- aria labels untuk icon-only buttons
- accessible dialogs
- accessible form labels

Canvas harus tetap memiliki alternatif navigasi melalui profile/search/list.

---

# 31. Image Treatment

Portrait:

```text
aspect-ratio: 1 / 1
object-fit: cover
```

Historical images:

boleh mempertahankan aspect ratio asli.

Jangan memotong foto penting secara agresif.

Gunakan responsive image loading.

---

# 32. Archive Gallery

Gunakan grid sederhana:

Desktop:

```text
4 columns
```

Tablet:

```text
3 columns
```

Mobile:

```text
2 columns
```

Tidak menggunakan masonry jika tidak diperlukan.

---

# 33. Design Tokens

Centralize:

```text
colors
spacing
radius
typography
shadows
transitions
```

Jangan hardcode visual values berulang di berbagai component.

---

# 34. Component Architecture

Recommended:

```text
components/
├── genealogy/
│   ├── FamilyCanvas
│   ├── PersonNode
│   ├── RelationshipEdge
│   ├── CoupleNode
│   ├── CanvasControls
│   └── FamilyMiniMap
│
├── people/
│   ├── PersonCard
│   ├── PersonProfile
│   ├── PersonForm
│   └── PeopleTable
│
├── relationships/
│   ├── RelationshipForm
│   └── RelationshipList
│
├── archive/
│   ├── MediaGallery
│   ├── MediaUploader
│   └── MediaViewer
│
└── ui/
```

---

# 35. Frontend Architecture

Separate:

```text
UI
Domain logic
Data access
```

Jangan menaruh Supabase query langsung di setiap visual component.

Recommended conceptual structure:

```text
app/
components/
features/
lib/
services/
types/
hooks/
```

---

# 36. Genealogy Domain Layer

Create functions/services such as:

```text
getPerson()
getAncestors()
getDescendants()
getChildren()
getParents()
getSpouses()
getFamilyBranch()
createPerson()
createUnion()
createParentChildRelationship()
```

Canvas memanggil domain layer.

Canvas tidak melakukan genealogy logic sendiri.

---

# 37. State Management

Gunakan local React state untuk UI sederhana.

Gunakan state management hanya jika benar-benar diperlukan.

Pisahkan:

### Server state

- people
- relationships
- media

### UI state

- selected person
- canvas viewport
- open panel
- active filters

Jangan mencampurkan keduanya.

---

# 38. Performance Rules

- Lazy load heavy canvas components.
- Jangan load archive images sebelum diperlukan.
- Compress/optimize uploaded images.
- Paginate people list.
- Debounce search.
- Query hanya relationship yang diperlukan.
- Jangan refetch seluruh tree setiap node selection.
- Cache stable data.
- Avoid unnecessary React re-renders.

---

# 39. Anti AI-Slop Rules

Implementer WAJIB menghindari:

```text
gradient hero
glass cards
giant rounded cards
emoji navigation
purple/blue AI gradient
excessive shadows
floating blobs
fake statistics
decorative dashboard widgets
unnecessary illustrations
```

Jika sebuah elemen tidak membantu user memahami atau mengelola data keluarga, jangan tambahkan.

---

# 40. Final Visual Principle

The application should look like:

> A carefully designed digital family archive.

Bukan:

> An AI-generated family-tree landing page.

Prioritaskan:

```text
Typography
Spacing
Hierarchy
Data clarity
Relationships
Navigation
Accessibility
```

di atas dekorasi.