import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const SparklesIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      strokeWidth="1.5"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715l-.525-1.837a2.625 2.625 0 00-1.802-1.802l-1.837-.525 1.837-.525a2.625 2.625 0 001.802-1.802l.525-1.837.525 1.837a2.625 2.625 0 001.802 1.802l1.837.525-1.837.525a2.625 2.625 0 00-1.802 1.802l-.525 1.837zM18.259 22.215l-.525-1.837a2.625 2.625 0 00-1.802-1.802l-1.837-.525 1.837-.525a2.625 2.625 0 001.802-1.802l.525-1.837.525 1.837a2.625 2.625 0 001.802 1.802l1.837.525-1.837.525a2.625 2.625 0 00-1.802 1.802l-.525 1.837z"
      />
    </svg>
  )
})

SparklesIcon.displayName = "SparklesIcon"
