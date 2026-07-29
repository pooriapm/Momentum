import {
  forwardRef,
  type ButtonHTMLAttributes,
} from 'react'
import {
  buttonClassNames,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      block = false,
      className,
      size = 'md',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => (
    <button
      className={buttonClassNames({ block, className, size, variant })}
      ref={ref}
      type={type}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
