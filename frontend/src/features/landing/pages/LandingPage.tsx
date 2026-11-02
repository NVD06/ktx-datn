import { useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardPen,
  Clock,
  FileSignature,
  KeyRound,
  LampDesk,
  MapPin,
  Snowflake,
  UserRoundCheck,
  Wifi,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Các mục trên thanh điều hướng — mỗi mục là một khối trong trang, bấm thì cuộn tới. */
const SECTIONS = [
  { id: 'trang-chu', label: 'Trang chủ' },
  { id: 'huong-dan', label: 'Hướng dẫn đăng ký' },
  { id: 'loai-phong', label: 'Các loại phòng' },
  { id: 'lien-he', label: 'Liên hệ & Hỗ trợ' },
]
const SECTION_IDS = SECTIONS.map((s) => s.id)

const HIGHLIGHTS = [
  { title: 'Trực tuyến', description: 'Đăng ký, ký hợp đồng, thanh toán VNPay' },
  { title: 'Trang bị đầy đủ', description: 'Giường riêng, bàn học, wifi' },
  { title: 'Tiết kiệm', description: 'Chi phí hợp lý cho sinh viên' },
]

// Bám theo luồng thật của hệ thống — docs/flows/registration-contract-flow.md.
const STEPS = [
  { icon: KeyRound, title: 'Nhận tài khoản', description: 'Ban quản lý cấp tài khoản. Đăng nhập lần đầu và đổi mật khẩu.' },
  { icon: UserRoundCheck, title: 'Hoàn thiện hồ sơ', description: 'Bổ sung thông tin cá nhân — hồ sơ đủ mới nộp được đơn.' },
  { icon: ClipboardPen, title: 'Nộp đơn đăng ký', description: 'Khi đợt đăng ký mở, chọn tòa và loại phòng mong muốn rồi gửi đơn.' },
  { icon: FileSignature, title: 'Ký hợp đồng', description: 'Ban quản lý duyệt đơn và xếp giường, bạn xem lại và ký hợp đồng trực tuyến.' },
]

const BUILDINGS = [
  { title: 'Tòa nam', description: 'Dành riêng cho sinh viên nam, nhiều loại phòng theo số giường.' },
  { title: 'Tòa nữ', description: 'Dành riêng cho sinh viên nữ, nhiều loại phòng theo số giường.' },
]

const AMENITIES = [
  { icon: Snowflake, label: 'Máy lạnh' },
  { icon: Wifi, label: 'Wifi' },
  { icon: LampDesk, label: 'Bàn học' },
  { icon: BedDouble, label: 'Giường riêng' },
]

const CONTACTS = [
  { icon: MapPin, label: 'Văn phòng', value: 'Ban quản lý Ký túc xá' },
  { icon: Clock, label: 'Giờ làm việc', value: 'Thứ 2 – Thứ 6, 7:30 – 17:00' },
]

/** Ảnh minh họa ở khối đầu trang. Chưa có ảnh thì khung vẫn hiện nền navy kèm biểu tượng. */
const HERO_IMAGE = '/images/landing-building.jpg'

/**
 * Trang giới thiệu công khai ở '/', cho khách chưa đăng nhập.
 *
 * Không có trang đăng ký tài khoản — mọi nút đều dẫn tới /login.
 */
export function LandingPage() {
  const active = useActiveSection(SECTION_IDS)

  return (
    <div className="min-h-svh">
      <header className="bg-card/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <a
            href="#trang-chu"
            onClick={scrollToSection('trang-chu')}
            className="text-foreground text-xs font-semibold tracking-widest uppercase"
          >
            Ký túc xá đại học
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {SECTIONS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={scrollToSection(id)}
                className={cn(
                  'text-sm transition-colors',
                  active === id ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground font-medium',
                )}
              >
                {label}
              </a>
            ))}
          </nav>

          <Button asChild size="lg" className="rounded-full px-5">
            <Link to="/login">
              Đăng nhập
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        {/* --- Khối đầu trang ------------------------------------------------ */}
        <section id="trang-chu" className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <h1 className="font-heading text-foreground text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
                Chào mừng bạn đến với Cổng Đăng ký Ký túc xá Trường học
              </h1>
              <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
                Không gian sống tiện nghi, an toàn và gắn kết dành riêng cho các bạn sinh viên. Khám phá ngôi nhà thứ
                hai thân thiện để cùng học tập, rèn luyện và lưu giữ những kỷ niệm sinh viên tươi đẹp.
              </p>

              <Button asChild size="lg" className="shadow-primary/25 mt-8 h-12 px-6 text-base shadow-lg">
                <Link to="/login">
                  <ClipboardPen data-icon="inline-start" className="size-5" />
                  Đăng nhập ngay để đăng ký phòng
                </Link>
              </Button>

              <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t pt-8">
                {HIGHLIGHTS.map(({ title, description }) => (
                  <div key={title}>
                    <dt className="text-foreground text-base font-semibold">{title}</dt>
                    <dd className="text-muted-foreground mt-1 text-xs">{description}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroImage />
          </div>
        </section>

        {/* --- Hướng dẫn đăng ký -------------------------------------------- */}
        <section id="huong-dan" className="bg-card scroll-mt-16 border-y">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              title="Hướng dẫn đăng ký"
              description="Bốn bước để có chỗ ở trong ký túc xá — làm hoàn toàn trực tuyến."
            />

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, description }, i) => (
                <li key={title}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
                          <Icon className="size-5" />
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">Bước {i + 1}</span>
                      </div>
                      <CardTitle className="mt-3 font-semibold">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --- Các loại phòng ------------------------------------------------ */}
        <section id="loai-phong" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              title="Các loại phòng"
              description="Tòa nam và tòa nữ tách riêng. Loại phòng, giá và số chỗ trống cập nhật theo từng đợt đăng ký."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {BUILDINGS.map(({ title, description }) => (
                <Card key={title}>
                  <CardHeader>
                    <span className="bg-secondary text-secondary-foreground flex size-10 items-center justify-center rounded-lg">
                      <Building2 className="size-5" />
                    </span>
                    <CardTitle className="mt-3 font-semibold">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="font-semibold">Tiện nghi trong phòng</CardTitle>
                  <CardDescription>Trang bị tùy theo loại phòng.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-3">
                    {AMENITIES.map(({ icon: Icon, label }) => (
                      <li key={label} className="text-foreground flex items-center gap-2 text-sm">
                        <Icon className="text-primary size-4" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
              <p className="text-muted-foreground text-sm">Đăng nhập để xem chi tiết loại phòng, giá và chỗ còn trống.</p>
              <Button asChild variant="outline">
                <Link to="/login">
                  Xem chỗ trống
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* --- Liên hệ & Hỗ trợ --------------------------------------------- */}
        <section id="lien-he" className="bg-card scroll-mt-16 border-t">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
            <SectionHeading
              title="Liên hệ & Hỗ trợ"
              description="Chưa có tài khoản hoặc quên mật khẩu? Liên hệ ban quản lý ký túc xá để được cấp lại."
            />

            <ul className="grid gap-4 sm:grid-cols-2">
              {CONTACTS.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="text-foreground text-sm font-medium">{value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-6 text-center text-xs sm:px-6">
          © {new Date().getFullYear()} Ký túc xá Đại học
        </p>
      </footer>
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-foreground text-3xl font-bold tracking-tight">{title}</h2>
      <span className="bg-primary mt-3 block h-1 w-12 rounded-full" />
      <p className="text-muted-foreground mt-4">{description}</p>
    </div>
  )
}

/**
 * Ảnh khu ký túc xá, lớp phủ navy phía dưới để chữ trắng đọc được.
 *
 * Ảnh đặt làm nền CSS thay vì <img>: thiếu tệp thì không hiện biểu tượng ảnh vỡ,
 * chỉ còn nền navy và biểu tượng giường ở lớp dưới.
 */
function HeroImage() {
  return (
    <div className="bg-sidebar relative aspect-5/4 overflow-hidden rounded-2xl shadow-2xl">
      <BedDouble className="text-sidebar-foreground/20 absolute top-1/2 left-1/2 size-24 -translate-1/2" />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
      <div className="from-sidebar/90 via-sidebar/20 absolute inset-0 bg-linear-to-t to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-sidebar-foreground text-sm">Môi trường sống lý tưởng</p>
        <p className="text-sidebar-accent-foreground mt-1 text-xl font-bold">Hiện đại • Văn minh • An toàn</p>
      </div>
    </div>
  )
}

/** Cuộn mượt tới khối `id` thay vì nhảy thẳng; vẫn giữ `href` để mở tab mới/đọc màn hình hoạt động. */
function scrollToSection(id: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
}

/**
 * Khối đang nằm giữa màn hình — để tô đậm mục tương ứng trên thanh điều hướng.
 * Chỉ theo dõi một dải mỏng quanh giữa màn hình nên mỗi lúc chỉ một khối được chọn.
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}
