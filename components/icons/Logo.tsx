const Logo = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Mail envelope icon */}
    <rect x="4" y="8" width="24" height="16" rx="2" stroke="white" strokeWidth="2" fill="none" />
    <path
      d="M4 10L16 18L28 10"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Optional: Add a small dot indicator */}
    <circle cx="25" cy="11" r="3" fill="#22c55e" />
  </svg>
);

export default Logo;
