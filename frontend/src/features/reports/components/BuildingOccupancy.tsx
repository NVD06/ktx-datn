import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BED_HELD, BED_STATUS, GENDER, ROOM_STATUS } from '@/lib/labels'
import type { BedCounts, OccupancyBuilding } from '@/types/report'
import { OccupancyBar } from './OccupancyBar'
import { ReportSection } from './ReportSection'

/** Bốn cột đếm giường, cùng thứ tự ở dòng tầng và dòng phòng — nhãn lấy theo trạng thái giường. */
const COUNT_COLUMNS = [
  { key: 'occupiedBeds', label: BED_STATUS.OCCUPIED.label },
  { key: 'heldBeds', label: BED_HELD.label },
  { key: 'availableBeds', label: BED_STATUS.AVAILABLE.label },
  { key: 'maintenanceBeds', label: BED_STATUS.MAINTENANCE.label },
] as const satisfies { key: keyof BedCounts; label: string }[]

function CountCells({ counts }: { counts: BedCounts }) {
  return COUNT_COLUMNS.map(({ key }) => (
    <TableCell key={key} className="text-right tabular-nums">
      {/* Số 0 làm mờ để các ô có giường nổi lên. */}
      <span className={counts[key] === 0 ? 'text-muted-foreground' : undefined}>{counts[key]}</span>
    </TableCell>
  ))
}

/**
 * Lấp đầy của một tòa (US-06.2): thanh tổng của tòa ở góc thẻ, bảng chia theo tầng — dòng tầng có
 * thanh lấp đầy riêng, bên dưới là từng phòng với số giường còn trống.
 */
export function BuildingOccupancy({ report }: { report: OccupancyBuilding }) {
  const { building, floors } = report
  const summary = [
    `Tòa ${GENDER[building.gender].label.toLowerCase()}`,
    !building.isActive && 'ngừng hoạt động',
    `${report.occupiedBeds}/${report.bedCount} giường có người`,
    `${report.availableBeds} giường còn trống`,
  ]

  return (
    <ReportSection
      title={`Tòa ${building.name}`}
      description={summary.filter(Boolean).join(' · ')}
      action={<OccupancyBar occupied={report.occupiedBeds} total={report.bedCount} className="w-72" />}
    >
      {floors.length === 0 ? (
        <p className="text-muted-foreground text-sm">Tòa chưa có phòng nào đang hoạt động.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phòng</TableHead>
              <TableHead>Loại phòng</TableHead>
              <TableHead className="w-56">Lấp đầy</TableHead>
              {COUNT_COLUMNS.map(({ key, label }) => (
                <TableHead key={key} className="text-right">
                  {label}
                </TableHead>
              ))}
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {floors.map((floor) => (
              <Fragment key={floor.floor}>
                <TableRow className="bg-muted/50 hover:bg-muted/50 font-medium">
                  <TableCell colSpan={2}>
                    Tầng {floor.floor}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">{floor.rooms.length} phòng</span>
                  </TableCell>
                  <TableCell>
                    <OccupancyBar occupied={floor.occupiedBeds} total={floor.bedCount} />
                  </TableCell>
                  <CountCells counts={floor} />
                  <TableCell />
                </TableRow>
                {floor.rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>
                      <Link to={`/admin/rooms/${room.id}`} className="font-medium underline-offset-4 hover:underline">
                        {room.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{room.roomType.name}</TableCell>
                    <TableCell>
                      <OccupancyBar occupied={room.occupiedBeds} total={room.bedCount} />
                    </TableCell>
                    <CountCells counts={room} />
                    <TableCell>
                      <StatusBadge {...ROOM_STATUS[room.status]} />
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </ReportSection>
  )
}
