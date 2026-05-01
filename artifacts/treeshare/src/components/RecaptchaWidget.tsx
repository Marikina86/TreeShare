import { forwardRef, useEffect, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

const TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const SITE_KEY =
  import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY
    ? import.meta.env.VITE_RECAPTCHA_SITE_KEY
    : TEST_SITE_KEY;

interface RecaptchaWidgetProps {
  onChange: (token: string | null) => void;
}

const RecaptchaWidget = forwardRef<ReCAPTCHA, RecaptchaWidgetProps>(
  ({ onChange }, ref) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDark(mq.matches || document.documentElement.classList.contains("dark"));
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);

    return (
      <div className="flex justify-center">
        <ReCAPTCHA
          ref={ref}
          sitekey={SITE_KEY}
          theme={isDark ? "dark" : "light"}
          onChange={onChange}
        />
      </div>
    );
  }
);

RecaptchaWidget.displayName = "RecaptchaWidget";
export default RecaptchaWidget;
