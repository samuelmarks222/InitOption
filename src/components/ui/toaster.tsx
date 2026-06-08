import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isTradeOpen = props.variant === "tradeOpen";

        return (
          <Toast key={id} data-trade-open-toast={isTradeOpen ? "true" : undefined} {...props}>
            {isTradeOpen ? (
              title && (
                <ToastTitle className="max-w-[270px] truncate text-[12px] font-bold leading-none">
                  {title}
                </ToastTitle>
              )
            ) : (
              <>
                <div className="grid gap-1">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && <ToastDescription>{description}</ToastDescription>}
                </div>
                {action}
              </>
            )}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
