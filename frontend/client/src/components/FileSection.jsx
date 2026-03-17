import { ChevronDown } from "lucide-react";

function FileSection({ icon: Icon, label, count, children, open = false }) {
  return (
    <section className={`info-section ${open ? "open" : ""}`}>
      <div className="info-section-header">
        <div className="info-section-title">
          <Icon size={18} />
          <span>{count} {label}</span>
        </div>
        <ChevronDown size={18} />
      </div>
      {open ? <div className="info-section-body">{children}</div> : null}
    </section>
  );
}

export default FileSection;
