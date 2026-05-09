import Card from './Card';
import Icon from './Icon';
import { useAccent } from '../../context/TweakContext';

export default function StatCard({ label, value, sub, trend }) {
  const accent = useAccent();
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#E8EAF0', lineHeight: 1.1, fontFamily: 'DM Mono' }}>
        {value}
      </div>
      {sub && (
        <div style={{
          color:      trend === 'up' ? accent : trend === 'down' ? '#EF4444' : '#6B7280',
          fontSize:   11.5,
          marginTop:  5,
          fontWeight: 500,
          display:    'flex',
          alignItems: 'center',
          gap:        3,
        }}>
          {trend === 'up'   && <Icon name="up"   size={12} color={accent}    />}
          {trend === 'down' && <Icon name="down" size={12} color="#EF4444" />}
          {sub}
        </div>
      )}
    </Card>
  );
}
