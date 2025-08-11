type Props = { value: number }
export default function ProgressBar({ value }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div style={{ background:'#f3f4f6', borderRadius:8, height:10, width:'100%' }} aria-label="progress">
      <div style={{ width: pct+'%', background:'#2563eb', height:10, borderRadius:8 }} />
    </div>
  )
}
