export default function StatusBadge({ status }) {
  const inHouse = status === 'checked-in'
  return (
    <span className={`badge ${inHouse ? 'badge-in' : 'badge-out'}`}>
      {inHouse ? 'In-house' : 'Checked out'}
    </span>
  )
}
