interface AvatarProps {
  name: string;
  status?: string;
}

export const Avatar = ({ name, status }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="avatar">
      <div className="avatar__ring">
        <span>{initials}</span>
      </div>
      <div className="avatar__meta">
        <strong>{name}</strong>
        {status && <small>{status}</small>}
      </div>
    </div>
  );
};
