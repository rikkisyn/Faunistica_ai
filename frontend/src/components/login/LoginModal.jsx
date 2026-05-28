import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QrCodeImg from "../../img/qr-code.svg";
import { useNavigate } from "react-router-dom";
import "./LoginModal.css";
import { apiService } from "../../api";

const LoginModal = ({ onClose }) => {
  const { t } = useTranslation("loginModal");
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTooManyRequests, setIsTooManyRequests] = useState(false);
  const [registrationCode, setRegistrationCode] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState(null);

  const isRegisterMode = mode === "register";

  const resetRegistration = () => {
    setRegistrationCode("");
    setRegistrationStatus(null);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setIsTooManyRequests(false);
    resetRegistration();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const loginSuccess = await apiService.login(username, password);

      if (loginSuccess) {
        onClose();
        navigate("/form");
        window.location.reload();
      }
    } catch (err) {
      console.error("Login error: ", err);

      if (err.message === "wrong_pass") {
        setError(t("error.wrong_pass"));
      } else if (err.message === "not_user") {
        setError(t("error.no_user"));
      } else if (err.message === "many_attempts") {
        setIsTooManyRequests(true);
        setError(t("error.request_limit"));
        setTimeout(() => {
          setIsTooManyRequests(false);
          setError("");
        }, 30000);
      } else {
        setError(t("error.login_error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await apiService.startRegistration(username, password);
      setRegistrationCode(result.code);
      setRegistrationStatus("pending");
    } catch (err) {
      console.error("Registration error: ", err);
      if (err.message === "username_taken") {
        setError(t("error.username_taken"));
      } else if (err.message === "invalid_registration") {
        setError(t("error.invalid_registration"));
      } else {
        setError(t("error.registration_error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!registrationCode || registrationStatus !== "pending") {
      return;
    }

    let isCancelled = false;
    let timerId;

    const pollStatus = async () => {
      try {
        const result = await apiService.pollRegistrationStatus(registrationCode);
        if (isCancelled) {
          return;
        }
        if (result.status === "pending") {
          timerId = setTimeout(pollStatus, 1000);
          return;
        }
        setRegistrationStatus(result.status);
      } catch (err) {
        if (isCancelled) {
          return;
        }
        if (err.message === "registration_not_found") {
          setRegistrationStatus("expired");
          setError(t("error.code_expired"));
        } else {
          setRegistrationStatus("error");
          setError(t("error.registration_error"));
        }
      }
    };

    pollStatus();

    return () => {
      isCancelled = true;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [registrationCode, registrationStatus, t]);

  const handleSubmit = isRegisterMode ? handleRegister : handleLogin;
  const statusTextMap = {
    pending: t("modal.code_waiting"),
    confirmed: t("modal.code_confirmed"),
    expired: t("modal.code_expired"),
    error: t("modal.code_error"),
  };

  return (
    <div className="modal-overlay">
      <div className="modal telegram-login-modal">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2>{isRegisterMode ? t("modal.register_title") : t("modal.login_title")}</h2>

        <div className="telegram-instructions">
          <p>{isRegisterMode ? t("modal.register_text") : t("modal.login_text")}</p>

          <div className="qr-code-container">
            <a href="https://t.me/FaunisticaV3Bot" target="_blank" rel="noopener noreferrer">
              <img src={QrCodeImg} alt="QR Code" className="qr-code" />
            </a>
            <p>{t("modal.tg_qr")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">{t("modal.tg_data")}</label>
            <input
              id="username"
              name="username"
              className="text-input"
              type="text"
              value={username}
              autoComplete="on"
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder={t("modal.username")}
              required
            />
            <input
              name="password"
              autoComplete="on"
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder={t("modal.pass")}
              required
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          {isRegisterMode && registrationCode && (
            <div className="registration-code">
              <p className="registration-code-label">{t("modal.code_label")}</p>
              <div className="registration-code-value">{registrationCode}</div>
              <p className="registration-code-instruction">{t("modal.code_instruction")}</p>
              {registrationStatus && (
                <p className="registration-status">
                  {statusTextMap[registrationStatus]}
                </p>
              )}
            </div>
          )}

          <button
            id="button_submit_text"
            type="submit"
            className="submit-button"
            disabled={
              isLoading || isTooManyRequests || (isRegisterMode && registrationStatus === "pending")
            }
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>{" "}
                {isRegisterMode ? t("modal.loading_register") : t("modal.loading_login")}
              </>
            ) : (
              isRegisterMode ? t("modal.button_register") : t("modal.button_login")
            )}
          </button>
        </form>

        <div className="help-text">
          <p>{isRegisterMode ? t("modal.register_issue") : t("modal.issue")}</p>
          <button
            className="switch-mode-button"
            type="button"
            onClick={() => switchMode(isRegisterMode ? "login" : "register")}
          >
            {isRegisterMode ? t("modal.switch_to_login") : t("modal.switch_to_register")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
