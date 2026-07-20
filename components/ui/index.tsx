"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { default: "bg-gold text-black hover:bg-[#dec79f]", outline: "border border-gold text-gold hover:bg-gold/10", ghost: "text-white hover:bg-white/8", destructive: "bg-[var(--danger)] text-black" }, size: { default: "h-10", sm: "h-8 px-3 text-xs", lg: "h-12 px-6" } },
  defaultVariants: { variant: "default", size: "default" },
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input ref={ref} className={cn("h-10 w-full rounded-sm border bg-black/20 px-3 text-sm outline-none placeholder:text-muted focus:border-gold", className)} {...props} />);
Input.displayName = "Input";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => <textarea ref={ref} className={cn("min-h-24 w-full rounded-sm border bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-gold", className)} {...props} />);
Textarea.displayName = "Textarea";
export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn("mb-1.5 block text-xs font-medium tracking-wide text-[#d6d1c7]", className)} {...props} />;
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("surface rounded-sm", className)} {...props} />;
export const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span className={cn("inline-flex rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold", className)} {...props} />;
export const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full bg-border", className)} />;
export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded bg-white/10", className)} />;
export const EmptyState = ({ title = "Nog geen gegevens", description = "Zodra er gegevens beschikbaar zijn, ziet u ze hier.", action }: { title?: string; description?: string; action?: React.ReactNode }) => <Card className="p-10 text-center"><p className="display text-2xl">{title}</p><p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</Card>;
export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => <div className="overflow-x-auto"><table className={cn("w-full text-left text-sm", className)} {...props} /></div>;
export const Tabs = ({ children }: { children: React.ReactNode }) => <div className="flex gap-2 border-b pb-3">{children}</div>;
export const TabsTrigger = ({ active, children }: { active?: boolean; children: React.ReactNode }) => <button className={cn("text-sm text-muted", active && "text-gold")}>{children}</button>;
export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} type="checkbox" className="h-4 w-4 accent-[#c5a572]" {...props} />);
Checkbox.displayName = "Checkbox";
export const Switch = ({ checked, onChange }: { checked?: boolean; onChange?: (value: boolean) => void }) => <button type="button" onClick={() => onChange?.(!checked)} className={cn("relative h-6 w-10 rounded-full transition", checked ? "bg-gold" : "bg-white/15")}><span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition", checked ? "left-5" : "left-1")} /></button>;
export const Avatar = ({ name = "VDB" }: { name?: string }) => <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">{name.slice(0, 2).toUpperCase()}</div>;
export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="h-10 w-full rounded-sm border bg-black px-3 text-sm outline-none focus:border-gold" {...props} />;
export const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => <span title={content}>{children}</span>;
export const Dialog = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const AlertDialog = Dialog;
export const DropdownMenu = Dialog;
