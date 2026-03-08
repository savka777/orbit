type OrbitMarkProps = {
  className?: string
}

export default function OrbitMark({ className = 'h-5 w-5' }: OrbitMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M23.926 8.379C22.01 6.77 19.538 5.8 16.84 5.8C10.764 5.8 5.84 10.724 5.84 16.8C5.84 22.876 10.764 27.8 16.84 27.8C22.916 27.8 27.84 22.876 27.84 16.8C27.84 15.524 27.623 14.299 27.223 13.159"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M24.252 4.9C26.094 6.167 27.591 7.899 28.578 9.921"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18.15 11.361C17.327 10.981 16.41 10.769 15.444 10.769C11.895 10.769 9.018 13.646 9.018 17.195C9.018 20.744 11.895 23.621 15.444 23.621C18.992 23.621 21.869 20.744 21.869 17.195C21.869 16.237 21.659 15.327 21.283 14.51"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="23.95" cy="8.15" r="2.15" fill="currentColor" />
    </svg>
  )
}
