PRD — Family Genealogy & Archive System
1. Product Overview

Nama sementara: Family Genealogy

Family Genealogy adalah aplikasi web untuk mendokumentasikan, mengelola, dan memvisualisasikan silsilah keluarga secara digital.

Aplikasi tidak boleh diperlakukan hanya sebagai "family tree generator". Sistem harus menyimpan data orang dan hubungan antar-orang sebagai data terstruktur, sedangkan visualisasi canvas hanyalah representasi dari data tersebut.

Tujuan utama:

Mendokumentasikan silsilah keluarga secara permanen.
Menyimpan profil setiap anggota keluarga.
Memvisualisasikan hubungan keluarga melalui interactive genealogy canvas.
Mendukung struktur keluarga yang kompleks.
Menyimpan foto dan dokumentasi keluarga.
Memungkinkan data berkembang secara bertahap.
Menjaga privasi data keluarga.
Tetap nyaman digunakan pada desktop maupun mobile.
2. Core Principles
2.1 Data First

Database adalah sumber kebenaran utama.

Canvas tidak boleh menjadi sumber kebenaran genealogis.

Posisi node di canvas hanyalah presentation state.

2.2 Relationship First

Hubungan keluarga harus dimodelkan secara eksplisit.

Sistem tidak boleh berasumsi:

satu orang hanya mempunyai satu pasangan
seseorang hanya mempunyai satu alamat
semua anak berasal dari pasangan yang sama
semua orang memiliki orang tua yang diketahui
semua anggota keluarga masih hidup
semua hubungan harus berupa hubungan biologis
2.3 Privacy First

Data seperti:

nomor telepon
alamat lengkap
tanggal lahir
foto pribadi

harus dapat dikontrol visibilitasnya.

Jangan menganggap seluruh data keluarga layak ditampilkan kepada publik.

3. Recommended Technology Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
Genealogy Canvas
XYFlow / React Flow

Canvas harus mendukung:

pan
zoom
node selection
edge relationships
minimap
fit view
automatic layout
manual positioning

Untuk automatic layout dapat menggunakan:

ELK.js

atau algoritma layout yang sesuai.

Backend

Supabase:

PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
PostgreSQL functions/views bila diperlukan
Deployment
Vercel
4. User Roles

Minimal terdapat:

Super Admin

Dapat:

membuat anggota keluarga
mengedit anggota
menghapus/archive anggota
membuat hubungan
mengubah hubungan
mengatur visibilitas data
mengelola foto
mengelola dokumentasi
mengatur layout
mengelola pengguna
melihat audit log
Family Member

Jika sistem nantinya dibuka untuk anggota keluarga:

melihat data yang diizinkan
melihat silsilah
melihat profil
melihat dokumentasi
mengusulkan perubahan

Perubahan tidak langsung diterapkan jika approval system diaktifkan.

Public

Jika public mode diaktifkan:

Hanya dapat melihat informasi yang memang ditandai public.

5. Main Modules
5.1 Genealogy Canvas

Halaman utama aplikasi.

Canvas menampilkan:

Person Node
Couple/Union
Parent → Child relationships
Family branches

Fitur:

zoom in
zoom out
pan
fit view
fullscreen
search
focus person
focus descendants
focus ancestors
automatic layout
manual layout
reset layout
6. Person Node

Setiap orang direpresentasikan sebagai node.

Minimal:

Foto
Nama
Gelar/prefix
jenis kelamin
status hidup/wafat

Contoh:

┌──────────────────────────────┐
│ [PHOTO]                      │
│                              │
│ H. Misbahul Khair            │
│ Laki-laki                    │
│                              │
│ + Hj. Laela Wahyuni          │
└──────────────────────────────┘

Node harus tetap sederhana.

Jangan menampilkan seluruh informasi pribadi di canvas.

7. Person Profile

Ketika node diklik, tampilkan detail profile.

Identity
Full name
Display name
Titles
Nickname
Gender
Photo
Birth date
Birth place
Death date
Death place
Life status
Contact
Phone
WhatsApp
Email
Website/social link jika diperlukan
Location

Jangan hanya menyimpan satu field "alamat".

Pisahkan:

address
village
district
regency/city
province
country
postal code
location coordinates (optional)

Satu orang dapat mempunyai lebih dari satu alamat.

Contoh:

Current Residence
Family Home
Work Address
Historical Residence
8. Biography

Setiap orang dapat memiliki:

biography
education
occupation
organization
achievements
notes

Tidak semua harus wajib.

Tujuannya adalah mendokumentasikan sejarah keluarga, bukan hanya nama.

9. Relationship Model

Sistem harus mendukung relationship yang fleksibel.

Spouse / Partner

Contoh:

Ahlan ───────── Siti Maskah
Biological Parent
Father → Child
Mother → Child
Adoptive Parent
Adoptive Parent → Child
Step Parent
Step Parent → Child
Guardian

Dapat digunakan untuk hubungan pengasuhan yang bukan hubungan biologis.

10. Complex Family Cases

Sistem WAJIB dapat menangani:

Multiple marriages

Seseorang dapat mempunyai lebih dari satu union.

Person A
 ├── Marriage 1 → Person B
 │       └── Children
 │
 └── Marriage 2 → Person C
         └── Children
Previous marriage

Anak dapat terhubung hanya ke union tertentu.

Unknown parent

Anak dapat mempunyai:

Father: Unknown
Mother: Known

tanpa membuat fake person.

Unknown spouse

Jangan membuat dummy person bernama "Unknown".

Gunakan nullable relationship.

Adopted child

Hubungan biologis dan adoptif harus dapat hidup bersamaan.

Step family

Dapat direpresentasikan tanpa mengubah hubungan biologis.

Deceased person

Person tetap disimpan.

Status:

living
deceased
unknown
Same-name people

Nama bukan unique identifier.

Gunakan UUID.

11. Genealogy Relationship Architecture

Database harus memisahkan:

Person

Data seseorang.

Union

Hubungan pasangan/pernikahan.

Parent-Child Relationship

Hubungan orang tua dan anak.

Contoh:

Person A
Person B

        ↓

Union

        ↓

Person C
Person D

Jangan menyimpan:

father_id
mother_id
spouse_id

sebagai satu-satunya mekanisme hubungan.

Model tersebut terlalu terbatas untuk genealogy kompleks.

12. Recommended Database Schema
people
id uuid primary key
full_name text not null
display_name text
nickname text
prefix_title text
suffix_title text

gender text

birth_date date
birth_date_precision text
birth_place text

death_date date
death_date_precision text
death_place text

life_status text default 'unknown'

biography text
occupation text
education text
notes text

created_at timestamptz
updated_at timestamptz
created_by uuid
updated_by uuid

birth_date_precision dapat berupa:

exact
year
month
unknown

Hal ini penting karena data keluarga lama sering tidak memiliki tanggal lengkap.

13. unions

Mewakili hubungan pasangan.

id uuid primary key

relationship_type text

start_date date
end_date date

start_date_precision text
end_date_precision text

status text

notes text

created_at timestamptz
updated_at timestamptz

Contoh relationship_type:

marriage
partner
engagement
historical_union
unknown

Status:

active
ended
widowed
divorced
unknown
14. union_members

Karena satu union dapat mempunyai lebih dari satu person.

id uuid primary key
union_id uuid references unions(id)
person_id uuid references people(id)

role text

created_at timestamptz

Role:

spouse
partner

Jangan membuat person.spouse_id.

15. parent_child_relationships
id uuid primary key

parent_id uuid references people(id)
child_id uuid references people(id)

relationship_type text

biological_status text

created_at timestamptz
updated_at timestamptz

relationship_type:

parent
guardian

biological_status:

biological
adoptive
step
unknown

Dengan model ini:

A → C
B → C

dapat direpresentasikan secara independen.

16. addresses

Satu orang dapat memiliki banyak alamat.

id uuid primary key
person_id uuid references people(id)

label text

address_line text
village text
district text
city_regency text
province text
country text
postal_code text

latitude numeric
longitude numeric

is_current boolean

created_at timestamptz
updated_at timestamptz

Contoh label:

Current Residence
Family Home
Work
Historical
17. contacts

Pisahkan kontak dari person.

id uuid primary key
person_id uuid references people(id)

contact_type text
label text
value text

is_primary boolean
is_public boolean

created_at timestamptz

contact_type:

phone
whatsapp
email
18. media

Untuk foto dan dokumentasi.

id uuid primary key

title text
description text

storage_path text

media_type text

uploaded_by uuid

created_at timestamptz
19. person_media

Many-to-many relationship.

person_id uuid references people(id)
media_id uuid references media(id)

role text

Role:

portrait
family_photo
historical_photo
document
other
20. locations

Optional reusable location master.

id uuid primary key

name text
type text

country text
province text
city_regency text
district text
village text

latitude numeric
longitude numeric

created_at timestamptz
21. genealogy_canvas_layouts

Layout adalah presentation state, bukan genealogy data.

id uuid primary key

name text

root_person_id uuid references people(id)

viewport jsonb

created_by uuid

created_at timestamptz
updated_at timestamptz
22. genealogy_node_positions
id uuid primary key

layout_id uuid references genealogy_canvas_layouts(id)
person_id uuid references people(id)

position_x numeric
position_y numeric

width numeric
height numeric

created_at timestamptz
updated_at timestamptz
23. Audit Logs

Semua perubahan penting sebaiknya dicatat.

id uuid primary key

user_id uuid
action text
entity_type text
entity_id uuid

old_data jsonb
new_data jsonb

created_at timestamptz

Contoh:

UPDATE
people
UUID: ...
Changed by: ...
24. Data Visibility

Setiap data sensitif dapat mempunyai visibility.

Minimal:

public
family
private

Contoh:

Name          → public
Photo         → family
Phone         → family
Full Address  → family
Biography     → public

RLS Supabase wajib diterapkan.

Jangan mengandalkan hiding element pada frontend sebagai security.

25. Search

Search global harus dapat mencari:

nama
nickname
gelar
daerah
pasangan
anak
occupation

Contoh:

Search: "Misbah"

→ H. Misbahul Khair

Saat hasil dipilih:

canvas pindah ke person
node di-highlight
profile panel dibuka
26. Genealogy Navigation

Setiap person memiliki actions:

View Profile
Focus Person
View Parents
View Children
View Ancestors
View Descendants
View Spouse
27. Ancestor View

Contoh:

                    Grandparents
                         │
                      Parents
                         │
                       Person
28. Descendant View

Contoh:

Person
   │
Children
   │
Grandchildren
   │
Great-grandchildren

Jumlah generasi dapat dipilih.

Contoh:

1 generation
2 generations
3 generations
All
29. Family Branch

Pengguna dapat memilih satu anggota sebagai root.

Contoh:

Root:
H. Abdul Muizzi

Mode:
Descendants

Canvas hanya menampilkan cabang tersebut.

Ini penting agar keluarga besar tidak menjadi satu canvas yang tidak terbaca.

30. Current Seed Data

Data awal yang diberikan:

TGH. ABDUL MU'IN + MASDEP
BOHARI + AMNAH

        │
      AHLAN + Hj. SITI MASKAH

        ├── ANAK 1
        │
        │ H. MISBAHUL KHAIR + Hj. LAELA WAHYUNI
        │
        │ ├── KHAIRUL ATQIYA + RATU KAMILA
        │ ├── DHIYA UDUHA + THABRANI
        │ │    ├── HATICA LUBNA
        │ │    └── ZAINA
        │ ├── AHMAD TANJIALLAH
        │ └── KHAIRINA YASMIN
        │
        ├── ANAK 2
        │
        │ Hj. DWI SAPARIAH
        │
        ├── ANAK 3
        │
        │ H. ABDUL MUIZZI + NURAINI
        │
        │ ├── NUZI AJRINA + MUHAMMAD IDRUS FAROGI
        │ │    ├── JAMILAL MUHAYYA UZAIBAL MADZAQ
        │ │    └── SAYYIDA SOFIYA NAFISA
        │ │
        │ └── MUHAMMAD FITRONI JAZLAN
        │
        └── ANAK 4

          SITI IZZATILLAH + MUJTAHIDIN

          ├── MUDAWAMATUL MUAJAHAH
          │     +
          │   MUHAMMAD ARDIANNUR FILSUF TASAUFI
          │
          │     └── BUNAYYA MUHAMMAD FATIHIL QUDS
          │
          └── SIGAP DWI AMINULLAH

Catatan implementasi:

Jangan langsung menganggap setiap tanda + sebagai marriage.

Data seed harus dimasukkan sebagai relationship yang dapat diverifikasi/edit oleh administrator.

31. Admin Interface

Dashboard:

Family Genealogy

People              37
Relationships       41
Photos              128
Documents           16

[Open Family Tree]
[Add Person]
[Add Relationship]
[Upload Archive]

Sidebar:

Overview
Family Tree
People
Relationships
Places
Media
Archives
Users
Audit Log
Settings
32. Person Management

Table:

Photo | Name | Gender | Status | Family Branch | Updated

Actions:

View
Edit
Archive

Filter:

branch
gender
living/deceased
location
generation
33. Add Person

Form dibagi menjadi section:

Basic Information

Name
Display Name
Nickname
Titles
Gender

Birth

Birth date
Birth date precision
Birth place

Life

Life status
Death date
Death place

Contact

Phone
WhatsApp
Email

Location

Address

Biography

Biography
Occupation
Education
Notes

Photo

Portrait

Setelah person dibuat:

[Save Person]

Kemudian relationship dapat dibuat dari profile.

34. Relationship Creation

Flow:

Select Person A
        ↓
Select relationship
        ↓
Select Person B
        ↓
Configure details
        ↓
Save

Untuk parent-child:

Parent
Child
Relationship Type
Biological Status

Untuk pasangan:

Person A
Person B
Relationship Type
Start Date
End Date
Status
35. Media Archive

Archive harus mendukung:

foto
family photo
historical photo
document

Setiap media dapat dikaitkan dengan:

satu person
banyak person
family branch
event
36. Mobile UX

Mobile bukan sekadar desktop yang diperkecil.

Pada mobile:

Canvas

Gunakan:

touch pan
pinch zoom
tap node

Detail person tampil sebagai:

Bottom Sheet

bukan sidebar selebar desktop.

Desktop

Detail person:

Right Side Panel
Mobile navigation

Gunakan:

Bottom Navigation

untuk fitur utama.

Contoh:

Tree     People     Search     Archive     More
37. Responsive Requirements

Wajib mendukung:

320px+
375px
390px
430px
768px
1024px
1280px
1440px+

Tidak boleh ada:

horizontal page overflow
text terpotong
tombol terlalu kecil
canvas tidak dapat digunakan dengan touch
modal keluar layar

Minimum touch target:

44 × 44 px
38. Performance

Target:

fast initial load
lazy-load media
image optimization
pagination untuk people
virtualization bila data besar
debounce search
cache query yang sesuai
jangan mengambil seluruh genealogy setiap membuka halaman jika tidak diperlukan

Canvas harus hanya memuat node yang relevan ketika menggunakan branch/focus mode.

39. Security

Gunakan:

Supabase Auth
Row Level Security
Storage policies
role-based authorization
server-side validation
database constraints
audit logs

Jangan menyimpan Supabase service role key di client.

40. Data Integrity

Database harus mempunyai constraint untuk mencegah:

person menjadi parent dirinya sendiri
child menjadi parent dirinya sendiri
duplicate relationship
duplicate union member
orphan relationship
invalid UUID
invalid date relationship

Validasi genealogical yang lebih kompleks dapat dilakukan melalui application/service layer.

41. Soft Delete

Jangan langsung menghapus person.

Gunakan:

archived_at

Jika seseorang salah dibuat:

Archive

bukan hard delete.

Hard delete hanya tersedia untuk Super Admin dengan confirmation.

42. Import / Export

Tahap awal:

CSV import
CSV export
JSON backup

Tahap lanjutan:

GEDCOM import/export

Sistem sebaiknya dirancang agar suatu saat dapat mendukung GEDCOM tanpa perlu mengubah arsitektur utama.

43. UX Philosophy

UI harus terasa seperti:

professional information system
digital archive
genealogy research tool

Bukan:

social media
landing page startup
dashboard penuh card
AI-generated website

Gunakan whitespace, typography, border, dan hierarchy sebagai elemen visual utama.

44. MVP

MVP wajib memiliki:

Authentication
People CRUD
Relationship CRUD
Supabase database
Supabase Storage
Interactive genealogy canvas
Search
Person profile
Photo
Address
Contact
Ancestor view
Descendant view
Manual canvas positioning
Auto layout
Responsive mobile UI
RLS
Audit log
45. Phase 2

Tambahkan:

family archive
document archive
approval workflow
family branches
advanced search
timeline
historical events
map
GEDCOM
print genealogy
PDF export
public family tree
invitation system
46. Definition of Done

Feature dianggap selesai jika:

berfungsi di desktop
berfungsi di mobile
tidak menyebabkan layout overflow
database relationship benar
RLS benar
loading state tersedia
error state tersedia
empty state tersedia
form validation tersedia
keyboard navigation dasar tersedia
tidak menggunakan fake/mock data pada production flow
tidak menggunakan hardcoded genealogy relationships di frontend
canvas mengambil relationship dari database
foto menggunakan Supabase Storage
tidak ada secret di client