import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase"; // Adicione esta linha

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function gerarCodigo() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const N = "0123456789";
  let c = "";
  for (let i = 0; i < 3; i++) c += L[Math.floor(Math.random() * L.length)];
  c += "-";
  for (let i = 0; i < 4; i++) c += N[Math.floor(Math.random() * N.length)];
  return c;
}

function hoje() { return new Date().toISOString().split("T")[0]; }

function fmtData(d) {
  if (!d) return "";
  const p = d.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

function calcIdade(nasc) {
  if (!nasc) return "";
  const d = new Date(nasc + "T00:00:00"), h = new Date();
  let anos = h.getFullYear() - d.getFullYear();
  let meses = h.getMonth() - d.getMonth();
  if (meses < 0) { anos--; meses += 12; }
  if (anos >= 1) return anos + " ano" + (anos > 1 ? "s" : "") + " e " + meses + " mes" + (meses !== 1 ? "es" : "");
  return meses + " mes" + (meses !== 1 ? "es" : "");
}

function getEmoji(esp) {
  const m = { Cao: "🐶", Gato: "🐱", Ave: "🐦", Coelho: "🐰", Outro: "🐾" };
  return m[esp] || "🐾";
}

function diasParaAgendamento(dataStr) {
  if (!dataStr) return null;
  const hoje_ = new Date(); hoje_.setHours(0,0,0,0);
  const d = new Date(dataStr + "T00:00:00");
  return Math.round((d - hoje_) / 86400000);
}

function statusAgendamento(ag) {
  const diff = diasParaAgendamento(ag.data);
  if (ag.status === "Cancelado") return { label: "Cancelado", cor: "#ef4444", bg: "#fee2e2" };
  if (ag.status === "Concluido") return { label: "Concluido", cor: "#1ba870", bg: "#e8faf4" };
  if (diff === null) return { label: "Agendado", cor: "#3b82f6", bg: "#e0f2fe" };
  if (diff < 0) return { label: "Atrasado", cor: "#ef4444", bg: "#fee2e2" };
  if (diff === 0) return { label: "Hoje!", cor: "#f97316", bg: "#fff7ed" };
  if (diff === 1) return { label: "Amanha", cor: "#f59e0b", bg: "#fef9c3" };
  return { label: "Agendado", cor: "#3b82f6", bg: "#e0f2fe" };
}

// ─────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────
const DB_KEY = "petshop_pro_v1";

// --- SEÇÃO DE PERSISTÊNCIA CORRIGIDA ---
async function loadDB() {
  try {
    const { data, error } = await supabase
      .from('petshop_data')
      .select('conteudo')
      .eq('id', 1)
      .single();

    if (data && data.conteudo && Object.keys(data.conteudo).length > 0) {
      return data.conteudo;
    }
  } catch (e) {
    console.error("Erro ao conectar com Supabase:", e);
  }

  // Se o banco estiver vazio, retorna os dados iniciais padrão
  return {
    empresa: { nome: "PetShop & Clinica", telefone: "", endereco: "", whatsapp: "", vet: "", crmv: "", logo: "" },
    pets: [],
    agendamentos: [],
    servicos: [
      { id: 1, nome: "Banho Pequeno", preco: "40,00", duracao: "1h", desc: "Banho completo" },
      { id: 7, nome: "Consulta Veterinaria", preco: "120,00", duracao: "30min", desc: "Consulta geral" }
    ]
  };
}

async function saveDB(db) {
  try {
    await supabase
      .from('petshop_data')
      .upsert({ id: 1, conteudo: db });
  } catch (e) {
    console.error("Erro ao salvar dados:", e);
  }
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Syne:wght@700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Nunito',sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh;}
input,select,textarea{font-family:'Nunito',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}
@keyframes slideUp{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
.fade-in{animation:fadeIn .3s ease;}
`;

// ─────────────────────────────────────────────
// BASE COMPONENTS
// ─────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#1e293b", color:"#fff", padding:"12px 22px", borderRadius:50, fontSize:14, fontWeight:700, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 24px rgba(0,0,0,.3)", animation:"toastIn .3s ease" }}>
      {msg}
    </div>
  );
}

function Btn({ children, onClick, color, style, small, outline, full, disabled }) {
  const bg = color || "#7c3aed";
  const base = {
    fontFamily:"Nunito,sans-serif", fontWeight:800, cursor: disabled ? "not-allowed" : "pointer",
    borderRadius:10, border: outline ? "2px solid "+bg : "none",
    fontSize: small ? 13 : 15, padding: small ? "8px 14px" : "13px 18px",
    background: disabled ? "#e2e8f0" : outline ? "transparent" : bg,
    color: disabled ? "#94a3b8" : outline ? bg : "#fff",
    display:"flex", alignItems:"center", gap:6, justifyContent:"center",
    opacity: disabled ? .7 : 1, transition:"opacity .15s, transform .1s",
    width: full ? "100%" : undefined, ...(style||{})
  };
  return <button style={base} onClick={disabled ? undefined : onClick}>{children}</button>;
}

function Inp({ value, onChange, placeholder, type, rows, min }) {
  const s = { width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontFamily:"Nunito,sans-serif", fontSize:14, color:"#1e293b", outline:"none", background:"#fff" };
  if (rows) return <textarea style={{...s, resize:"vertical"}} rows={rows} value={value} onChange={onChange} placeholder={placeholder} />;
  return <input style={s} type={type||"text"} value={value} onChange={onChange} placeholder={placeholder} min={min} />;
}

function Sel({ value, onChange, options }) {
  return (
    <select style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontFamily:"Nunito,sans-serif", fontSize:14, color:"#1e293b", background:"#fff", outline:"none" }} value={value} onChange={onChange}>
      {options.map(function(o) {
        const v = typeof o === "object" ? o.value : o;
        const l = typeof o === "object" ? o.label : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

function Field({ label, children, half }) {
  return (
    <div style={{ marginBottom:14, gridColumn: half ? undefined : undefined }}>
      <label style={{ display:"block", fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:"#64748b", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div onClick={function(e){ if(e.target===e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth: wide ? 720 : 640, maxHeight:"94vh", overflowY:"auto", animation:"slideUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:18 }}>{title}</div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:"50%", width:34, height:34, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:"#64748b", margin:"20px 0 10px", display:"flex", alignItems:"center", gap:8 }}>
      {children}
      <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
    </div>
  );
}

function Badge({ children, color, bg }) {
  const c = color || "#7c3aed";
  return <span style={{ background: bg || c+"20", color:c, border:"1.5px solid "+c+"35", borderRadius:50, padding:"3px 10px", fontSize:11, fontWeight:800, whiteSpace:"nowrap" }}>{children}</span>;
}

function Card({ children, style }) {
  return <div style={{ background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", padding:16, ...style }}>{children}</div>;
}

function Empty({ icon, title, desc }) {
  return (
    <div style={{ textAlign:"center", padding:"44px 20px", color:"#94a3b8" }}>
      <div style={{ fontSize:52, marginBottom:14 }}>{icon}</div>
      <div style={{ fontWeight:800, fontSize:17, color:"#64748b", marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:14 }}>{desc}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WHATSAPP HELPERS
// ─────────────────────────────────────────────
function enviarWhatsApp(tel, msg) {
  const t = (tel || "").replace(/\D/g, "");
  if (!t) { alert("Telefone do tutor nao cadastrado."); return; }
  window.open("https://wa.me/55" + t + "?text=" + encodeURIComponent(msg), "_blank");
}

function msgConfirmacao(ag, pet, empresa) {
  return "Ola " + (pet ? pet.tutorNome : "") + "! 🐾\n\n" +
    "Seu agendamento foi confirmado!\n\n" +
    "📋 *" + ag.servico + "*\n" +
    "🐶 Pet: " + (pet ? pet.nome : "") + "\n" +
    "📅 Data: " + fmtData(ag.data) + "\n" +
    "🕐 Horario: " + ag.hora + "\n\n" +
    "📍 " + (empresa.nome || "Nossa loja") + "\n" +
    (empresa.endereco ? "📌 " + empresa.endereco + "\n" : "") +
    "\nQualquer duvida, estamos a disposicao! 😊";
}

function msgLembrete(ag, pet, empresa) {
  return "Ola " + (pet ? pet.tutorNome : "") + "! 👋\n\n" +
    "Lembrete do seu agendamento amanha:\n\n" +
    "✂️ *" + ag.servico + "*\n" +
    "🐶 " + (pet ? pet.nome : "") + "\n" +
    "📅 " + fmtData(ag.data) + " as " + ag.hora + "\n\n" +
    "📍 " + (empresa.nome || "Nossa loja") + "\n\n" +
    "Esperamos voce! 🐾";
}

function msgCancelamento(ag, pet, empresa) {
  return "Ola " + (pet ? pet.tutorNome : "") + ",\n\n" +
    "Seu agendamento foi cancelado:\n\n" +
    "✂️ " + ag.servico + "\n" +
    "📅 " + fmtData(ag.data) + " as " + ag.hora + "\n\n" +
    "Entre em contato para remarcar. 😊\n" +
    (empresa.whatsapp ? "📱 " + empresa.whatsapp : "");
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function TelaLogin({ onAdmin, onTutor }) {
  const [modo, setModo] = useState("inicio");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");

  if (modo === "inicio") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"linear-gradient(135deg,#1e293b 0%,#312e81 100%)" }}>
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:72, marginBottom:10 }}>{"🐾"}</div>
        <div style={{ fontFamily:"Syne,sans-serif", fontSize:36, fontWeight:800, color:"#fff", letterSpacing:-1 }}>PetShop Pro</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,.6)", marginTop:6 }}>Sistema de Gestao para Pet Shop</div>
      </div>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:12 }}>
        <Btn onClick={function(){ setModo("tutor"); setErro(""); }} color="#7c3aed" style={{ borderRadius:14, padding:"16px 20px", fontSize:16 }}>
          {"🐶"} Acessar Cartao do Pet
        </Btn>
        <Btn onClick={function(){ setModo("admin"); setErro(""); }} color="#fff" style={{ borderRadius:14, padding:"16px 20px", fontSize:16, color:"#1e293b" }}>
          {"🏪"} Painel do Estabelecimento
        </Btn>
      </div>
      <div style={{ marginTop:32, fontSize:12, color:"rgba(255,255,255,.3)" }}>PetShop Pro v2.0</div>
    </div>
  );

  if (modo === "tutor") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"linear-gradient(135deg,#1e293b 0%,#312e81 100%)" }}>
      <div style={{ width:"100%", maxWidth:380, background:"#fff", borderRadius:24, padding:28, boxShadow:"0 24px 64px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize:44, marginBottom:12, textAlign:"center" }}>{"🔑"}</div>
        <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:22, marginBottom:6, textAlign:"center" }}>Codigo do Pet</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:22, textAlign:"center" }}>Digite o codigo fornecido pelo estabelecimento</div>
        <Field label="Codigo de acesso">
          <Inp value={codigo} onChange={function(e){ setCodigo(e.target.value.toUpperCase()); }} placeholder="Ex: ABC-1234" />
        </Field>
        {erro ? <div style={{ color:"#ef4444", fontSize:13, marginBottom:12, fontWeight:700, textAlign:"center" }}>{"⚠️ "}{erro}</div> : null}
        <Btn full onClick={function(){ const c=codigo.trim().toUpperCase(); if(!c){setErro("Digite o codigo."); return;} onTutor(c,setErro); }}>
          Acessar Cartao
        </Btn>
        <button onClick={function(){ setModo("inicio"); setErro(""); setCodigo(""); }} style={{ width:"100%", marginTop:12, background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:13, fontWeight:700, padding:8 }}>Voltar</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"linear-gradient(135deg,#1e293b 0%,#312e81 100%)" }}>
      <div style={{ width:"100%", maxWidth:380, background:"#fff", borderRadius:24, padding:28, boxShadow:"0 24px 64px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize:44, marginBottom:12, textAlign:"center" }}>{"🏪"}</div>
        <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:22, marginBottom:6, textAlign:"center" }}>Acesso Admin</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:22, textAlign:"center" }}>Restrito ao estabelecimento</div>
        <Field label="Senha">
          <Inp type="password" value={senha} onChange={function(e){ setSenha(e.target.value); }} placeholder="••••••••" />
        </Field>
        {erro ? <div style={{ color:"#ef4444", fontSize:13, marginBottom:12, fontWeight:700, textAlign:"center" }}>{"⚠️ "}{erro}</div> : null}
        <div style={{ fontSize:11, color:"#94a3b8", marginBottom:14, textAlign:"center" }}>Senha padrao: admin123</div>
        <Btn full onClick={function(){ if(senha==="admin123"){ setErro(""); onAdmin(); } else setErro("Senha incorreta."); }} color="#1e293b">
          Entrar
        </Btn>
        <button onClick={function(){ setModo("inicio"); setErro(""); setSenha(""); }} style={{ width:"100%", marginTop:12, background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:13, fontWeight:700, padding:8 }}>Voltar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL CODIGO GERADO
// ─────────────────────────────────────────────
function ModalCodigo({ open, pet, empresa, onClose }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    if (!pet) return;
    navigator.clipboard.writeText(pet.codigo).then(function(){ setCopiado(true); setTimeout(function(){ setCopiado(false); }, 2000); });
  }
  return (
    <Modal open={open} onClose={onClose} title={"✅ Pet Cadastrado!"}>
      <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
        <div style={{ fontSize:60, marginBottom:10 }}>{pet ? getEmoji(pet.especie) : "🐾"}</div>
        <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>{pet ? pet.nome : ""}</div>
        <div style={{ fontSize:14, color:"#64748b", marginBottom:24 }}>Cadastro realizado com sucesso!</div>
        <div style={{ background:"linear-gradient(135deg,#f5f3ff,#ede9fe)", border:"2px solid #7c3aed", borderRadius:18, padding:24, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:"#7c3aed", marginBottom:10 }}>{"🔑 Codigo de Acesso do Tutor"}</div>
          <div style={{ fontFamily:"monospace", fontSize:42, fontWeight:900, color:"#7c3aed", letterSpacing:8 }}>{pet ? pet.codigo : ""}</div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:10 }}>Entregue este codigo ao tutor</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Btn full onClick={copiar} color={copiado ? "#1ba870" : "#7c3aed"}>{copiado ? "✅ Copiado!" : "📋 Copiar Codigo"}</Btn>
          {pet && pet.tutorTel ? (
            <Btn full onClick={function(){
              const msg = "Ola " + pet.tutorNome + "! 🐾\n\nSeu pet *" + pet.nome + "* foi cadastrado no " + (empresa.nome||"PetShop") + "!\n\n🔑 *Codigo de acesso:* " + pet.codigo + "\n\nUse este codigo para acessar o cartao de saude digital do seu pet a qualquer momento!";
              enviarWhatsApp(pet.tutorTel, msg);
            }} color="#25D366">{"📱 Enviar Codigo por WhatsApp"}</Btn>
          ) : null}
          <Btn full onClick={onClose} color="#1e293b">{"Ir para o Cartao"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// MODAL CADASTRO PET
// ─────────────────────────────────────────────
function ModalPet({ open, onClose, onSave, petEdit }) {
  const vazio = { nome:"", especie:"Cao", raca:"", sexo:"Femea", nascimento:"", pelagem:"", microchip:"", alergias:"", obs:"", tutorNome:"", tutorTel:"", tutorEmail:"", tutorCidade:"" };
  const [f, setF] = useState(vazio);
  useEffect(function(){ if(open) setF(petEdit ? Object.assign({},petEdit) : Object.assign({},vazio)); }, [open]);
  function set(k,v){ setF(function(p){ return Object.assign({},p,{[k]:v}); }); }
  function salvar(){
    if(!f.nome.trim()){ alert("Nome do pet obrigatorio."); return; }
    if(!f.tutorNome.trim()){ alert("Nome do tutor obrigatorio."); return; }
    onSave(Object.assign({},f)); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={petEdit ? "Editar Pet" : "Cadastrar Novo Pet"}>
      <SecTitle>{"🐾 Dados do Pet"}</SecTitle>
      <Field label="Nome do Pet"><Inp value={f.nome} onChange={function(e){ set("nome",e.target.value); }} placeholder="Ex: Pipoca" /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="Especie"><Sel value={f.especie} onChange={function(e){ set("especie",e.target.value); }} options={["Cao","Gato","Ave","Coelho","Outro"]} /></Field>
        <Field label="Raca"><Inp value={f.raca} onChange={function(e){ set("raca",e.target.value); }} placeholder="Ex: Shih Tzu" /></Field>
        <Field label="Sexo"><Sel value={f.sexo} onChange={function(e){ set("sexo",e.target.value); }} options={["Femea","Macho"]} /></Field>
        <Field label="Nascimento"><Inp type="date" value={f.nascimento} onChange={function(e){ set("nascimento",e.target.value); }} /></Field>
        <Field label="Pelagem"><Inp value={f.pelagem} onChange={function(e){ set("pelagem",e.target.value); }} placeholder="Ex: Caramelo" /></Field>
        <Field label="Microchip"><Inp value={f.microchip} onChange={function(e){ set("microchip",e.target.value); }} placeholder="No do chip" /></Field>
      </div>
      <Field label="Alergias e Restricoes"><Inp value={f.alergias} onChange={function(e){ set("alergias",e.target.value); }} placeholder="Ex: Dipirona, shampoo forte..." /></Field>
      <Field label="Observacoes"><Inp rows={2} value={f.obs} onChange={function(e){ set("obs",e.target.value); }} placeholder="Informacoes adicionais..." /></Field>
      <SecTitle>{"👤 Dados do Tutor"}</SecTitle>
      <Field label="Nome do Tutor"><Inp value={f.tutorNome} onChange={function(e){ set("tutorNome",e.target.value); }} placeholder="Nome completo" /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="WhatsApp"><Inp value={f.tutorTel} onChange={function(e){ set("tutorTel",e.target.value); }} placeholder="(XX) 99999-9999" /></Field>
        <Field label="Email"><Inp type="email" value={f.tutorEmail} onChange={function(e){ set("tutorEmail",e.target.value); }} placeholder="email@..." /></Field>
      </div>
      <Field label="Cidade / Estado"><Inp value={f.tutorCidade} onChange={function(e){ set("tutorCidade",e.target.value); }} placeholder="Ex: Sao Paulo/SP" /></Field>
      <Btn full onClick={salvar} style={{ marginTop:8 }}>{petEdit ? "Salvar Alteracoes" : "Cadastrar Pet"}</Btn>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// MODAL AGENDAMENTO
// ─────────────────────────────────────────────
function ModalAgendamento({ open, onClose, onSave, pets, servicos, agEdit }) {
  const vazio = { petId:"", servico:"", data: hoje(), hora:"09:00", obs:"", status:"Agendado", preco:"", lembrete:true };
  const [f, setF] = useState(vazio);
  useEffect(function(){ if(open) setF(agEdit ? Object.assign({},agEdit) : Object.assign({},vazio,{ petId: pets.length>0 ? String(pets[0].id) : "" })); }, [open]);
  function set(k,v){ setF(function(p){ return Object.assign({},p,{[k]:v}); }); }

  const servSel = servicos.find(function(s){ return s.nome===f.servico; });

  function salvar(){
    if(!f.petId){ alert("Selecione o pet."); return; }
    if(!f.servico){ alert("Selecione o servico."); return; }
    if(!f.data){ alert("Informe a data."); return; }
    onSave(Object.assign({},f)); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={agEdit ? "Editar Agendamento" : "Novo Agendamento"}>
      <Field label="Pet">
        <Sel value={f.petId} onChange={function(e){ set("petId",e.target.value); }} options={[{value:"",label:"-- Selecione o pet --"}].concat(pets.map(function(p){ return {value:String(p.id), label:p.nome+" ("+p.tutorNome+")"}; }))} />
      </Field>
      <Field label="Servico">
        <Sel value={f.servico} onChange={function(e){
          set("servico",e.target.value);
          const s = servicos.find(function(sv){ return sv.nome===e.target.value; });
          if(s) setF(function(p){ return Object.assign({},p,{servico:e.target.value,preco:s.preco}); });
        }} options={[{value:"",label:"-- Selecione o servico --"}].concat(servicos.map(function(s){ return {value:s.nome, label:s.nome+" - R$ "+s.preco}; }))} />
      </Field>
      {servSel ? (
        <div style={{ background:"#f5f3ff", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#5b21b6", display:"flex", justifyContent:"space-between" }}>
          <span>{"⏱ "}{servSel.duracao}</span>
          <span>{"💰 R$ "}{servSel.preco}</span>
        </div>
      ) : null}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="Data"><Inp type="date" value={f.data} onChange={function(e){ set("data",e.target.value); }} min={hoje()} /></Field>
        <Field label="Horario"><Inp type="time" value={f.hora} onChange={function(e){ set("hora",e.target.value); }} /></Field>
      </div>
      <Field label="Valor Cobrado (R$)"><Inp value={f.preco} onChange={function(e){ set("preco",e.target.value); }} placeholder="Ex: 55,00" /></Field>
      <Field label="Observacoes"><Inp rows={2} value={f.obs} onChange={function(e){ set("obs",e.target.value); }} placeholder="Observacoes sobre o servico..." /></Field>
      {agEdit ? (
        <Field label="Status">
          <Sel value={f.status} onChange={function(e){ set("status",e.target.value); }} options={["Agendado","Concluido","Cancelado"]} />
        </Field>
      ) : null}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, background:"#f0fdf4", borderRadius:10, padding:"10px 14px" }}>
        <input type="checkbox" id="lembrete" checked={f.lembrete} onChange={function(e){ set("lembrete",e.target.checked); }} style={{ width:18, height:18, accentColor:"#25D366" }} />
        <label htmlFor="lembrete" style={{ fontSize:13, fontWeight:700, color:"#15803d", cursor:"pointer" }}>{"📱 Enviar confirmacao por WhatsApp ao salvar"}</label>
      </div>
      <Btn full onClick={salvar}>{agEdit ? "Salvar Alteracoes" : "Confirmar Agendamento"}</Btn>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// ADMIN – PAINEL PRINCIPAL
// ─────────────────────────────────────────────
function AdminPanel({ db, onSelectPet, onLogout, onUpdateDB }) {
  const [aba, setAba] = useState("dashboard");
  const [toast, setToast] = useState("");
  const [modalNovoPet, setModalNovoPet] = useState(false);
  const [modalCodigo, setModalCodigo] = useState(null);
  const [modalAg, setModalAg] = useState(false);
  const [agEdit, setAgEdit] = useState(null);
  const [modalServ, setModalServ] = useState(false);
  const [servEdit, setServEdit] = useState(null);
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [buscaPet, setBuscaPet] = useState("");
  const [filtroAg, setFiltroAg] = useState("todos");

  function showToast(m){ setToast(m); setTimeout(function(){ setToast(""); },2800); }

  // ── PETS ──
  function salvarPet(form) {
    let novo;
    if (form.id) {
      novo = Object.assign({},db,{ pets: db.pets.map(function(p){ return p.id===form.id ? Object.assign({},form) : p; }) });
    } else {
      const pet = Object.assign({},form,{ id:Date.now(), codigo:gerarCodigo(), vacinas:[], medicacoes:[], receituarios:[], exames:[], consultas:[], pesos:[] });
      novo = Object.assign({},db,{ pets: db.pets.concat([pet]) });
      setModalCodigo(pet);
      onUpdateDB(novo);
      return;
    }
    onUpdateDB(novo);
    showToast("Pet salvo!");
  }

  // ── AGENDAMENTOS ──
  function salvarAg(form) {
    const pet = db.pets.find(function(p){ return String(p.id)===String(form.petId); });
    let novo;
    if (form.id) {
      novo = Object.assign({},db,{ agendamentos: db.agendamentos.map(function(a){ return a.id===form.id ? Object.assign({},form,{id:a.id}) : a; }) });
    } else {
      const ag = Object.assign({},form,{ id:Date.now() });
      novo = Object.assign({},db,{ agendamentos: db.agendamentos.concat([ag]) });
      if (form.lembrete && pet && pet.tutorTel) {
        enviarWhatsApp(pet.tutorTel, msgConfirmacao(ag, pet, db.empresa));
      }
    }
    onUpdateDB(novo);
    showToast("Agendamento salvo!");
    setAgEdit(null);
  }

  function removerAg(id) {
    if (!window.confirm("Remover agendamento?")) return;
    onUpdateDB(Object.assign({},db,{ agendamentos: db.agendamentos.filter(function(a){ return a.id!==id; }) }));
    showToast("Removido.");
  }

  function cancelarAg(ag) {
    const pet = db.pets.find(function(p){ return String(p.id)===String(ag.petId); });
    const novo = Object.assign({},db,{ agendamentos: db.agendamentos.map(function(a){ return a.id===ag.id ? Object.assign({},a,{status:"Cancelado"}) : a; }) });
    onUpdateDB(novo);
    if (pet && pet.tutorTel) enviarWhatsApp(pet.tutorTel, msgCancelamento(ag, pet, db.empresa));
    showToast("Agendamento cancelado.");
  }

  function concluirAg(ag) {
    const novo = Object.assign({},db,{ agendamentos: db.agendamentos.map(function(a){ return a.id===ag.id ? Object.assign({},a,{status:"Concluido"}) : a; }) });
    onUpdateDB(novo);
    showToast("Marcado como concluido!");
  }

  function enviarLembrete(ag) {
    const pet = db.pets.find(function(p){ return String(p.id)===String(ag.petId); });
    if (!pet || !pet.tutorTel) { alert("Tutor sem WhatsApp cadastrado."); return; }
    enviarWhatsApp(pet.tutorTel, msgLembrete(ag, pet, db.empresa));
    showToast("Lembrete enviado!");
  }

  // ── SERVICOS ──
  function salvarServico(form) {
    let novo;
    if (form.id) {
      novo = Object.assign({},db,{ servicos: db.servicos.map(function(s){ return s.id===form.id ? form : s; }) });
    } else {
      novo = Object.assign({},db,{ servicos: db.servicos.concat([Object.assign({},form,{id:Date.now()})]) });
    }
    onUpdateDB(novo); showToast("Servico salvo!"); setServEdit(null);
  }

  function removerServico(id) {
    if (!window.confirm("Remover servico?")) return;
    onUpdateDB(Object.assign({},db,{ servicos: db.servicos.filter(function(s){ return s.id!==id; }) }));
    showToast("Removido.");
  }

  // ── FILTROS AGENDAMENTOS ──
  const ags = db.agendamentos.slice().sort(function(a,b){ return a.data>b.data ? 1 : a.data<b.data ? -1 : a.hora>b.hora ? 1 : -1; });
  const agsFiltrados = ags.filter(function(a){
    if (filtroAg==="hoje") return a.data===hoje() && a.status!=="Cancelado";
    if (filtroAg==="proximos") { const d=diasParaAgendamento(a.data); return d!==null && d>=0 && d<=7 && a.status==="Agendado"; }
    if (filtroAg==="pendentes") return a.status==="Agendado";
    if (filtroAg==="concluidos") return a.status==="Concluido";
    return true;
  });

  // ── DASHBOARD STATS ──
  const agsHoje = db.agendamentos.filter(function(a){ return a.data===hoje() && a.status!=="Cancelado"; }).length;
  const agsSemana = db.agendamentos.filter(function(a){ const d=diasParaAgendamento(a.data); return d!==null && d>=0 && d<=6 && a.status==="Agendado"; }).length;
  const faturamento = db.agendamentos.filter(function(a){ return a.status==="Concluido"; }).reduce(function(acc,a){ return acc + parseFloat((a.preco||"0").replace(",",".")); }, 0);

  const ABAS = [
    {id:"dashboard", label:"Dashboard", icon:"📊"},
    {id:"agendamentos", label:"Agendamentos", icon:"📅"},
    {id:"pets", label:"Pets", icon:"🐾"},
    {id:"servicos", label:"Servicos", icon:"✂️"},
    {id:"config", label:"Config", icon:"⚙️"},
  ];

  const petsBusca = db.pets.filter(function(p){
    const b = buscaPet.toLowerCase();
    return p.nome.toLowerCase().includes(b) || p.tutorNome.toLowerCase().includes(b) || p.codigo.includes(buscaPet.toUpperCase());
  });

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc" }}>
      <Toast msg={toast} />

      {/* TOP BAR */}
      <div style={{ background:"linear-gradient(135deg,#1e293b,#312e81)", color:"#fff", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 16px rgba(0,0,0,.2)" }}>
        <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:18, display:"flex", alignItems:"center", gap:8 }}>{"🐾 PetShop Pro"}</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <Btn small onClick={function(){ setModalNovoPet(true); }} color="#7c3aed">+ Pet</Btn>
          <Btn small onClick={function(){ setAgEdit(null); setModalAg(true); }} color="#059669">+ Agenda</Btn>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,.15)", border:"none", color:"#fff", borderRadius:50, padding:"6px 14px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Sair</button>
        </div>
      </div>

      {/* NAV TABS */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e2e8f0", overflowX:"auto", display:"flex", padding:"0 12px", gap:2 }}>
        {ABAS.map(function(t){
          return (
            <button key={t.id} onClick={function(){ setAba(t.id); }} style={{ flexShrink:0, padding:"13px 16px 11px", fontFamily:"Nunito,sans-serif", fontWeight:700, fontSize:13, color: aba===t.id ? "#7c3aed" : "#64748b", background:"none", border:"none", borderBottom:"3px solid "+(aba===t.id ? "#7c3aed" : "transparent"), cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding:16, maxWidth:800, margin:"0 auto", paddingBottom:80 }}>

        {/* ── DASHBOARD ── */}
        {aba==="dashboard" && (
          <div className="fade-in">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:20 }}>
              {[
                {icon:"📅", val:agsHoje, label:"Atendimentos Hoje", cor:"#7c3aed"},
                {icon:"📆", val:agsSemana, label:"Proximos 7 dias", cor:"#059669"},
                {icon:"🐾", val:db.pets.length, label:"Pets Cadastrados", cor:"#0284c7"},
                {icon:"💰", val:"R$ "+faturamento.toFixed(2).replace(".",","), label:"Faturamento Geral", cor:"#b45309"},
              ].map(function(item){
                return (
                  <div key={item.label} style={{ background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", padding:18, boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}>
                    <div style={{ fontSize:28, marginBottom:6 }}>{item.icon}</div>
                    <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:26, color:item.cor }}>{item.val}</div>
                    <div style={{ fontSize:12, color:"#64748b", fontWeight:700, marginTop:2 }}>{item.label}</div>
                  </div>
                );
              })}
            </div>

            <SecTitle>{"📅 Agendamentos de Hoje"}</SecTitle>
            {db.agendamentos.filter(function(a){ return a.data===hoje() && a.status!=="Cancelado"; }).length === 0
              ? <Empty icon={"📅"} title="Sem agendamentos hoje" desc="Nenhum servico marcado para hoje" />
              : db.agendamentos.filter(function(a){ return a.data===hoje() && a.status!=="Cancelado"; }).sort(function(a,b){ return a.hora>b.hora?1:-1; }).map(function(ag){
                const pet = db.pets.find(function(p){ return String(p.id)===String(ag.petId); });
                const st = statusAgendamento(ag);
                return (
                  <Card key={ag.id} style={{ marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:32, background:"#f5f3ff", width:52, height:52, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{pet ? getEmoji(pet.especie) : "🐾"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{ag.servico}</div>
                      <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{pet ? pet.nome+" · "+pet.tutorNome : "Pet nao encontrado"}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#7c3aed", marginTop:2 }}>{"🕐 "}{ag.hora}{ag.preco ? " · R$ "+ag.preco : ""}</div>
                    </div>
                    <Badge color={st.cor} bg={st.bg}>{st.label}</Badge>
                  </Card>
                );
              })
            }

            <SecTitle>{"🔔 Proximos Lembretes"}</SecTitle>
            {db.agendamentos.filter(function(a){ const d=diasParaAgendamento(a.data); return d===1 && a.status==="Agendado"; }).length === 0
              ? <div style={{ fontSize:13, color:"#94a3b8", textAlign:"center", padding:"16px 0" }}>Sem agendamentos para amanha</div>
              : db.agendamentos.filter(function(a){ const d=diasParaAgendamento(a.data); return d===1 && a.status==="Agendado"; }).map(function(ag){
                const pet = db.pets.find(function(p){ return String(p.id)===String(ag.petId); });
                return (
                  <Card key={ag.id} style={{ marginBottom:10, display:"flex", alignItems:"center", gap:12, background:"#f0fdf4", border:"1.5px solid #bbf7d0" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{pet ? pet.nome : ""} — {ag.servico}</div>
                      <div style={{ fontSize:12, color:"#64748b" }}>{"Amanha as "}{ag.hora}</div>
                    </div>
                    <Btn small onClick={function(){ enviarLembrete(ag); }} color="#25D366">{"📱 Lembrete"}</Btn>
                  </Card>
                );
              })
            }
          </div>
        )}

        {/* ── AGENDAMENTOS ── */}
        {aba==="agendamentos" && (
          <div className="fade-in">
            <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
              {[["todos","Todos"],["hoje","Hoje"],["proximos","7 dias"],["pendentes","Pendentes"],["concluidos","Concluidos"]].map(function(item){
                const ativo = filtroAg===item[0];
                return <button key={item[0]} onClick={function(){ setFiltroAg(item[0]); }} style={{ flexShrink:0, padding:"7px 14px", borderRadius:50, border:"1.5px solid "+(ativo?"#7c3aed":"#e2e8f0"), background:ativo?"#7c3aed":"#fff", color:ativo?"#fff":"#64748b", fontFamily:"Nunito,sans-serif", fontWeight:700, fontSize:12, cursor:"pointer" }}>{item[1]}</button>;
              })}
            </div>

            <Btn full onClick={function(){ setAgEdit(null); setModalAg(true); }} style={{ marginBottom:14 }}>{"+ Novo Agendamento"}</Btn>

            {agsFiltrados.length===0
              ? <Empty icon={"📅"} title="Sem agendamentos" desc="Nenhum agendamento encontrado" />
              : agsFiltrados.map(function(ag){
                const pet = db.pets.find(function(p){ return String(p.id)===String(ag.petId); });
                const st = statusAgendamento(ag);
                const diff = diasParaAgendamento(ag.data);
                return (
                  <Card key={ag.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ fontSize:32, background:"#f5f3ff", width:52, height:52, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {pet ? getEmoji(pet.especie) : "🐾"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
                          <div style={{ fontWeight:800, fontSize:15 }}>{ag.servico}</div>
                          <Badge color={st.cor} bg={st.bg}>{st.label}</Badge>
                        </div>
                        <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>
                          {pet ? (getEmoji(pet.especie)+" "+pet.nome+" · 👤 "+pet.tutorNome) : "Pet removido"}
                        </div>
                        <div style={{ fontSize:13, marginTop:4, display:"flex", gap:12, flexWrap:"wrap" }}>
                          <span>{"📅 "}{fmtData(ag.data)}</span>
                          <span>{"🕐 "}{ag.hora}</span>
                          {ag.preco ? <span style={{ fontWeight:800, color:"#059669" }}>{"R$ "}{ag.preco}</span> : null}
                        </div>
                        {ag.obs ? <div style={{ fontSize:12, color:"#94a3b8", marginTop:4, fontStyle:"italic" }}>{ag.obs}</div> : null}
                      </div>
                    </div>

                    {/* ACOES */}
                    <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                      {ag.status==="Agendado" ? (
                        <>
                          <Btn small onClick={function(){ enviarLembrete(ag); }} color="#25D366">{"📱 Lembrete"}</Btn>
                          <Btn small onClick={function(){ concluirAg(ag); }} color="#059669">{"✅ Concluir"}</Btn>
                          <Btn small onClick={function(){ setAgEdit(ag); setModalAg(true); }} color="#7c3aed" outline>{"✏️ Editar"}</Btn>
                          <Btn small onClick={function(){ cancelarAg(ag); }} color="#ef4444" outline>{"✕ Cancelar"}</Btn>
                        </>
                      ) : null}
                      {ag.status==="Concluido" ? (
                        <Btn small onClick={function(){ setAgEdit(ag); setModalAg(true); }} color="#64748b" outline>{"✏️ Editar"}</Btn>
                      ) : null}
                      {ag.status==="Cancelado" ? (
                        <>
                          <Btn small onClick={function(){ setAgEdit(Object.assign({},ag,{status:"Agendado"})); setModalAg(true); }} color="#7c3aed">{"🔄 Reagendar"}</Btn>
                          <Btn small onClick={function(){ removerAg(ag.id); }} color="#ef4444" outline>{"🗑 Remover"}</Btn>
                        </>
                      ) : null}
                    </div>
                  </Card>
                );
              })
            }
          </div>
        )}

        {/* ── PETS ── */}
        {aba==="pets" && (
          <div className="fade-in">
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <input value={buscaPet} onChange={function(e){ setBuscaPet(e.target.value); }} placeholder={"🔍 Buscar por nome, tutor ou codigo..."} style={{ flex:1, padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontFamily:"Nunito,sans-serif", fontSize:14, outline:"none", background:"#fff" }} />
              <Btn onClick={function(){ setModalNovoPet(true); }} style={{ borderRadius:10, flexShrink:0 }}>{"+ Novo"}</Btn>
            </div>
            {petsBusca.length===0
              ? <Empty icon={"🐾"} title="Nenhum pet encontrado" desc="Cadastre o primeiro pet" />
              : petsBusca.map(function(p){
                const ultimoAg = db.agendamentos.filter(function(a){ return String(a.petId)===String(p.id) && a.status!=="Cancelado"; }).sort(function(a,b){ return a.data>b.data?-1:1; })[0];
                return (
                  <Card key={p.id} style={{ marginBottom:10, cursor:"pointer", transition:"box-shadow .2s" }} onClick={function(){ onSelectPet(p.id); }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ fontSize:36, background:"#f5f3ff", width:56, height:56, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{getEmoji(p.especie)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:900, fontSize:16 }}>{p.nome}</div>
                        <div style={{ fontSize:13, color:"#64748b" }}>{p.raca} · {p.tutorNome}</div>
                        <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{"📱 "}{p.tutorTel||"Sem tel"}</div>
                        <div style={{ marginTop:6, display:"flex", gap:6, flexWrap:"wrap" }}>
                          <Badge color="#7c3aed">{"🔑 "}{p.codigo}</Badge>
                          {ultimoAg ? <Badge color="#059669">{"📅 "}{fmtData(ultimoAg.data)}</Badge> : null}
                          {p.alergias ? <Badge color="#ef4444">{"⚠️ Alergia"}</Badge> : null}
                        </div>
                      </div>
                      <div style={{ color:"#cbd5e1", fontSize:22 }}>{"›"}</div>
                    </div>
                  </Card>
                );
              })
            }
          </div>
        )}

        {/* ── SERVICOS ── */}
        {aba==="servicos" && (
          <div className="fade-in">
            <Btn full onClick={function(){ setServEdit({nome:"",preco:"",duracao:"",desc:""}); setModalServ(true); }} style={{ marginBottom:14 }}>{"+ Novo Servico"}</Btn>
            {db.servicos.map(function(s){
              return (
                <Card key={s.id} style={{ marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:28, background:"#f5f3ff", width:48, height:48, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{"✂️"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{s.nome}</div>
                    <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{s.desc}</div>
                    <div style={{ fontSize:13, marginTop:4, display:"flex", gap:12 }}>
                      <span style={{ fontWeight:800, color:"#059669" }}>{"R$ "}{s.preco}</span>
                      <span style={{ color:"#64748b" }}>{"⏱ "}{s.duracao}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn small onClick={function(){ setServEdit(s); setModalServ(true); }} color="#7c3aed" outline>{"✏️"}</Btn>
                    <Btn small onClick={function(){ removerServico(s.id); }} color="#ef4444" outline>{"🗑"}</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── CONFIG ── */}
        {aba==="config" && (
          <div className="fade-in">
            <SecTitle>{"🏪 Dados do Estabelecimento"}</SecTitle>
            <EmpresaForm db={db} onSave={function(emp){
              onUpdateDB(Object.assign({},db,{empresa:emp}));
              showToast("Dados salvos!");
            }} />
          </div>
        )}

      </div>

      {/* MODALS */}
      <ModalPet open={modalNovoPet} onClose={function(){ setModalNovoPet(false); }} onSave={salvarPet} />
      {modalCodigo ? <ModalCodigo open={true} pet={modalCodigo} empresa={db.empresa} onClose={function(){ setModalCodigo(null); onSelectPet(modalCodigo.id); }} /> : null}
      <ModalAgendamento open={modalAg} onClose={function(){ setModalAg(false); setAgEdit(null); }} onSave={salvarAg} pets={db.pets} servicos={db.servicos} agEdit={agEdit} />
      <ModalServico open={modalServ} onClose={function(){ setModalServ(false); setServEdit(null); }} onSave={salvarServico} servEdit={servEdit} />
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPRESA FORM
// ─────────────────────────────────────────────
function EmpresaForm({ db, onSave }) {
  const [f, setF] = useState(Object.assign({},db.empresa));
  function set(k,v){ setF(function(p){ return Object.assign({},p,{[k]:v}); }); }
  return (
    <div>
      <Card>
        <Field label="Nome do Estabelecimento"><Inp value={f.nome} onChange={function(e){ set("nome",e.target.value); }} placeholder="Ex: PetShop & Clinica" /></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Field label="Telefone"><Inp value={f.telefone} onChange={function(e){ set("telefone",e.target.value); }} placeholder="(XX) 9999-9999" /></Field>
          <Field label="WhatsApp"><Inp value={f.whatsapp} onChange={function(e){ set("whatsapp",e.target.value); }} placeholder="(XX) 99999-9999" /></Field>
        </div>
        <Field label="Endereco"><Inp value={f.endereco} onChange={function(e){ set("endereco",e.target.value); }} placeholder="Rua, numero, bairro..." /></Field>
        <Field label="Veterinario Responsavel"><Inp value={f.vet} onChange={function(e){ set("vet",e.target.value); }} placeholder="Dr(a). Nome" /></Field>
        <Field label="CRMV"><Inp value={f.crmv} onChange={function(e){ set("crmv",e.target.value); }} placeholder="CRMV 12345-SP" /></Field>
        <Btn full onClick={function(){ onSave(f); }}>{"💾 Salvar Configuracoes"}</Btn>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL SERVICO
// ─────────────────────────────────────────────
function ModalServico({ open, onClose, onSave, servEdit }) {
  const [f, setF] = useState({nome:"",preco:"",duracao:"",desc:""});
  useEffect(function(){ if(open && servEdit) setF(Object.assign({},servEdit)); }, [open]);
  function set(k,v){ setF(function(p){ return Object.assign({},p,{[k]:v}); }); }
  return (
    <Modal open={open} onClose={onClose} title={f.id ? "Editar Servico" : "Novo Servico"}>
      <Field label="Nome do Servico"><Inp value={f.nome} onChange={function(e){ set("nome",e.target.value); }} placeholder="Ex: Banho + Tosa" /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="Preco (R$)"><Inp value={f.preco} onChange={function(e){ set("preco",e.target.value); }} placeholder="55,00" /></Field>
        <Field label="Duracao"><Inp value={f.duracao} onChange={function(e){ set("duracao",e.target.value); }} placeholder="1h30" /></Field>
      </div>
      <Field label="Descricao"><Inp rows={2} value={f.desc} onChange={function(e){ set("desc",e.target.value); }} placeholder="Descricao do servico..." /></Field>
      <Btn full onClick={function(){ if(!f.nome){alert("Nome obrigatorio"); return;} onSave(f); onClose(); }}>{"Salvar Servico"}</Btn>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// CARTAO PET (tutor + admin)
// ─────────────────────────────────────────────
function CartaoPet({ pet: petProp, db, onBack, isAdmin, onUpdatePet, onUpdateDB }) {
  const [pet, setPet] = useState(petProp);
  const [aba, setAba] = useState("resumo");
  const [toast, setToast] = useState("");
  const [editando, setEditando] = useState(false);
  const [modalFAB, setModalFAB] = useState(false);
  const [modalVacina, setModalVacina] = useState(false);
  const [modalMed, setModalMed] = useState(false);
  const [modalExame, setModalExame] = useState(false);
  const [modalConsulta, setModalConsulta] = useState(false);
  const [modalPeso, setModalPeso] = useState(false);
  const [modalRec, setModalRec] = useState(false);
  const [modalNovoAg, setModalNovoAg] = useState(false);
  const [modalCodigo, setModalCodigo] = useState(false);
  const canvasRef = useRef(null);

  function showToast(m){ setToast(m); setTimeout(function(){ setToast(""); },2800); }
  function update(novo){ setPet(novo); onUpdatePet(novo); }
  function addItem(key,item){ const u=Object.assign({},pet,{[key]:(pet[key]||[]).concat([Object.assign({},item,{id:Date.now()})])}); update(u); showToast("Salvo!"); }
  function removeItem(key,id){ const u=Object.assign({},pet,{[key]:(pet[key]||[]).filter(function(x){ return x.id!==id; })}); update(u); showToast("Removido."); }

  // agendamentos do pet
  const meuAgs = db.agendamentos.filter(function(a){ return String(a.petId)===String(pet.id); }).sort(function(a,b){ return a.data>b.data?-1:1; });
  const proxAg = db.agendamentos.filter(function(a){ const d=diasParaAgendamento(a.data); return String(a.petId)===String(pet.id) && a.status==="Agendado" && d!==null && d>=0; }).sort(function(a,b){ return a.data>b.data?1:-1; })[0];

  // canvas peso
  useEffect(function(){
    if(aba!=="peso") return;
    setTimeout(function(){
      const canvas=canvasRef.current; if(!canvas) return;
      const dpr=window.devicePixelRatio||1;
      canvas.width=canvas.offsetWidth*dpr; canvas.height=160*dpr;
      const ctx=canvas.getContext("2d"); ctx.scale(dpr,dpr);
      const W=canvas.offsetWidth, H=160;
      const pts=(pet.pesos||[]).slice().sort(function(a,b){ return a.data>b.data?1:-1; });
      if(pts.length<2){ ctx.fillStyle="#94a3b8"; ctx.font="13px Nunito"; ctx.textAlign="center"; ctx.fillText("Registre ao menos 2 pesagens para ver o grafico",W/2,H/2); return; }
      const vals=pts.map(function(p){ return parseFloat(p.peso); });
      const minY=Math.floor(Math.min.apply(null,vals)-0.5), maxY=Math.ceil(Math.max.apply(null,vals)+0.5);
      const pad={top:20,bot:30,left:42,right:12};
      const cW=W-pad.left-pad.right, cH=H-pad.top-pad.bot;
      function cx(i){ return pad.left+(i/(pts.length-1))*cW; }
      function cy(v){ return pad.top+(1-(v-minY)/(maxY-minY))*cH; }
      [minY,(minY+maxY)/2,maxY].forEach(function(v){
        ctx.strokeStyle="#e2e8f0"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.left,cy(v)); ctx.lineTo(pad.left+cW,cy(v)); ctx.stroke();
        ctx.fillStyle="#94a3b8"; ctx.font="10px Nunito"; ctx.textAlign="right"; ctx.fillText(v.toFixed(1)+"kg",pad.left-4,cy(v)+3);
      });
      var grad=ctx.createLinearGradient(0,pad.top,0,pad.top+cH);
      grad.addColorStop(0,"rgba(124,58,237,.2)"); grad.addColorStop(1,"rgba(124,58,237,0)");
      ctx.beginPath(); ctx.moveTo(cx(0),cy(vals[0]));
      vals.forEach(function(v,i){ ctx.lineTo(cx(i),cy(v)); });
      ctx.lineTo(cx(vals.length-1),cy(minY)); ctx.lineTo(cx(0),cy(minY)); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx(0),cy(vals[0]));
      vals.forEach(function(v,i){ ctx.lineTo(cx(i),cy(v)); });
      ctx.strokeStyle="#7c3aed"; ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.stroke();
      pts.forEach(function(p,i){
        ctx.beginPath(); ctx.arc(cx(i),cy(vals[i]),5,0,Math.PI*2);
        ctx.fillStyle="#fff"; ctx.fill(); ctx.strokeStyle="#7c3aed"; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#475569"; ctx.font="9px Nunito"; ctx.textAlign="center";
        ctx.fillText(vals[i]+"kg",cx(i),cy(vals[i])-9);
        var lbl=p.data?p.data.slice(5).split("-").reverse().join("/"):"";
        ctx.fillText(lbl,cx(i),H-6);
      });
    },80);
  },[aba,pet.pesos]);

  const vVac={nome:"",data:hoje(),dose:"",lote:"",proximo:"",vet:""};
  const vMed={nome:"",posologia:"",inicio:hoje(),duracao:"",vet:"",obs:""};
  const vExm={nome:"",data:hoje(),status:"Pendente",resultado:"",vet:""};
  const vCon={tipo:"Consulta de rotina",data:hoje(),desc:"",vet:(db.empresa&&db.empresa.vet)||"",peso:""};
  const vPes={peso:"",data:hoje(),local:(db.empresa&&db.empresa.nome)||"",obs:""};
  const vRec={titulo:"",data:hoje(),meds:"",vet:(db.empresa&&db.empresa.vet)||""};

  const [fVac,setFVac]=useState(vVac);
  const [fMed,setFMed]=useState(vMed);
  const [fExm,setFExm]=useState(vExm);
  const [fCon,setFCon]=useState(vCon);
  const [fPes,setFPes]=useState(vPes);
  const [fRec,setFRec]=useState(vRec);

  function abrirModal(n){
    setModalFAB(false);
    if(n==="vacina"){ setFVac(Object.assign({},vVac)); setModalVacina(true); }
    if(n==="med"){ setFMed(Object.assign({},vMed)); setModalMed(true); }
    if(n==="exame"){ setFExm(Object.assign({},vExm)); setModalExame(true); }
    if(n==="consulta"){ setFCon(Object.assign({},vCon)); setModalConsulta(true); }
    if(n==="peso"){ setFPes(Object.assign({},vPes)); setModalPeso(true); }
    if(n==="rec"){ setFRec(Object.assign({},vRec)); setModalRec(true); }
  }

  const ABAS = [
    {id:"resumo",label:"Resumo",icon:"📋"},
    {id:"agendamentos",label:"Agenda",icon:"📅", cnt: meuAgs.filter(function(a){ return a.status==="Agendado"; }).length},
    {id:"vacinas",label:"Vacinas",icon:"💉",cnt:(pet.vacinas||[]).length},
    {id:"medicacoes",label:"Medicacoes",icon:"💊",cnt:(pet.medicacoes||[]).length},
    {id:"receituarios",label:"Receituarios",icon:"📄",cnt:(pet.receituarios||[]).length},
    {id:"exames",label:"Exames",icon:"🔬",cnt:(pet.exames||[]).length},
    {id:"historico",label:"Historico",icon:"📁",cnt:(pet.consultas||[]).length},
    {id:"peso",label:"Peso",icon:"⚖️"},
  ];
  if(isAdmin) ABAS.push({id:"codigo",label:"Codigo",icon:"🔑"});

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc" }}>
      <Toast msg={toast} />

      {/* TOPBAR */}
      <div style={{ background:"linear-gradient(135deg,#1e293b,#312e81)", color:"#fff", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 16px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:34, height:34, cursor:"pointer", fontSize:18, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>{"‹"}</button>
          <span style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:17 }}>{"🐾 PetShop Pro"}</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {isAdmin ? <Btn small onClick={function(){ setEditando(true); }} color="rgba(255,255,255,.2)" style={{ border:"1px solid rgba(255,255,255,.3)" }}>{"✏️ Editar"}</Btn> : null}
          <Btn small onClick={function(){
            const msg="Cartao de "+pet.nome+" | Codigo: "+pet.codigo;
            if(navigator.share) navigator.share({title:msg, url:window.location.href});
            else { navigator.clipboard.writeText(msg); showToast("Link copiado!"); }
          }} color="#7c3aed">{"↑"}</Btn>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff", padding:"28px 20px 22px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, background:"rgba(255,255,255,.06)", borderRadius:"50%" }} />
        <div style={{ position:"absolute", bottom:-40, left:-40, width:140, height:140, background:"rgba(255,255,255,.04)", borderRadius:"50%" }} />
        <div style={{ width:88, height:88, borderRadius:"50%", border:"3px solid rgba(255,255,255,.4)", background:"rgba(255,255,255,.15)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:46, position:"relative", zIndex:1 }}>
          {getEmoji(pet.especie)}
        </div>
        <div style={{ fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:800, position:"relative", zIndex:1 }}>{pet.nome}</div>
        <div style={{ fontSize:14, opacity:.8, marginTop:4, position:"relative", zIndex:1 }}>{pet.raca} · {pet.sexo} · {pet.especie}</div>
        {pet.nascimento ? <div style={{ display:"inline-block", background:"rgba(255,255,255,.2)", borderRadius:50, padding:"4px 14px", fontSize:13, fontWeight:700, marginTop:10, position:"relative", zIndex:1 }}>{calcIdade(pet.nascimento)}</div> : null}
        {proxAg ? (
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.2)", border:"1.5px solid rgba(255,255,255,.35)", borderRadius:50, padding:"6px 16px", fontSize:12, fontWeight:800, marginTop:10, marginLeft:8, position:"relative", zIndex:1 }}>
            {"✂️ Proximo: "}{fmtData(proxAg.data)}{" as "}{proxAg.hora}
          </div>
        ) : null}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12, flexWrap:"wrap", position:"relative", zIndex:1 }}>
          {(pet.vacinas||[]).length>0 ? <div style={{ background:"rgba(255,255,255,.18)", border:"1.5px solid rgba(255,255,255,.35)", borderRadius:50, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{"💉 "}{(pet.vacinas||[]).length}{" Vacinas"}</div> : null}
          {pet.alergias ? <div style={{ background:"rgba(239,68,68,.35)", border:"1.5px solid rgba(239,68,68,.5)", borderRadius:50, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{"⚠️ Alergia"}</div> : null}
          {isAdmin ? <div style={{ background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.3)", borderRadius:50, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{"🔑 "}{pet.codigo}</div> : null}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"#e2e8f0", borderBottom:"1px solid #e2e8f0" }}>
        {[["#7c3aed",(pet.vacinas||[]).length,"Vacinas"],["#f59e0b",(pet.exames||[]).filter(function(e){ return e.status==="Pendente"; }).length,"Exames"],["#059669",meuAgs.filter(function(a){ return a.status==="Agendado"; }).length,"Agendados"]].map(function(item){
          return (
            <div key={item[2]} style={{ background:"#fff", padding:"14px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:24, color:item[0], lineHeight:1 }}>{item[1]}</div>
              <div style={{ fontSize:10, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginTop:4 }}>{item[2]}</div>
            </div>
          );
        })}
      </div>

      {/* TABS */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e2e8f0", position:"sticky", top:57, zIndex:90 }}>
        <div style={{ display:"flex", overflowX:"auto", padding:"0 8px", gap:2 }}>
          {ABAS.map(function(t){
            return (
              <button key={t.id} onClick={function(){ setAba(t.id); }} style={{ flexShrink:0, padding:"12px 14px 10px", fontFamily:"Nunito,sans-serif", fontWeight:700, fontSize:12, color: aba===t.id ? "#7c3aed" : "#64748b", background:"none", border:"none", borderBottom:"3px solid "+(aba===t.id ? "#7c3aed" : "transparent"), cursor:"pointer", display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
                {t.icon}{" "}{t.label}
                {t.cnt>0 ? <span style={{ background:"#7c3aed", color:"#fff", borderRadius:50, padding:"1px 6px", fontSize:10 }}>{t.cnt}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:16, maxWidth:640, margin:"0 auto", paddingBottom:90 }}>

        {/* RESUMO */}
        {aba==="resumo" && (
          <div>
            <SecTitle>{"🐾 Dados do Pet"}</SecTitle>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {[["Especie",pet.especie],["Raca",pet.raca||"-"],["Sexo",pet.sexo],["Nascimento",pet.nascimento?fmtData(pet.nascimento):"-"],["Pelagem",pet.pelagem||"-"],["Microchip",pet.microchip||"-"]].map(function(item){
                return (
                  <div key={item[0]} style={{ background:"#fff", borderRadius:10, border:"1.5px solid #e2e8f0", padding:"10px 12px" }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:.8, color:"#64748b", marginBottom:3 }}>{item[0]}</div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{item[1]}</div>
                  </div>
                );
              })}
            </div>
            <SecTitle>{"👤 Tutor"}</SecTitle>
            <Card style={{ display:"flex", alignItems:"center", gap:12, background:"#faf5ff", border:"1.5px solid #e9d5ff", marginBottom:12 }}>
              <div style={{ width:50, height:50, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{"👤"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15 }}>{pet.tutorNome}</div>
                <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>
                  {pet.tutorTel ? <span style={{ marginRight:10 }}>{"📱 "}{pet.tutorTel}</span> : null}
                  {pet.tutorCidade ? <span>{"📍 "}{pet.tutorCidade}</span> : null}
                </div>
                {pet.tutorEmail ? <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{"✉️ "}{pet.tutorEmail}</div> : null}
              </div>
              {pet.tutorTel ? <Btn small onClick={function(){ enviarWhatsApp(pet.tutorTel,"Ola "+pet.tutorNome+"! Tudo bem?"); }} color="#25D366">{"📱"}</Btn> : null}
            </Card>
            {pet.alergias ? (
              <div>
                <SecTitle>{"⚠️ Alergias"}</SecTitle>
                <Card style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {pet.alergias.split(",").map(function(a){ return <Badge key={a} color="#ef4444">{a.trim()}</Badge>; })}
                </Card>
              </div>
            ) : null}
            {pet.obs ? (
              <div>
                <SecTitle>{"📝 Observacoes"}</SecTitle>
                <Card style={{ fontSize:14, color:"#475569" }}>{pet.obs}</Card>
              </div>
            ) : null}
            {proxAg ? (
              <div>
                <SecTitle>{"✂️ Proximo Servico"}</SecTitle>
                <Card style={{ background:"#faf5ff", border:"1.5px solid #e9d5ff" }}>
                  <div style={{ fontWeight:800, fontSize:15 }}>{proxAg.servico}</div>
                  <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{"📅 "}{fmtData(proxAg.data)}{" as "}{proxAg.hora}</div>
                  {proxAg.preco ? <div style={{ fontSize:13, fontWeight:800, color:"#059669", marginTop:4 }}>{"R$ "}{proxAg.preco}</div> : null}
                  {pet.tutorTel ? <Btn small onClick={function(){ enviarWhatsApp(pet.tutorTel, msgLembrete(proxAg,pet,db.empresa)); }} color="#25D366" style={{ marginTop:10 }}>{"📱 Enviar Lembrete"}</Btn> : null}
                </Card>
              </div>
            ) : null}
          </div>
        )}

        {/* AGENDAMENTOS DO PET */}
        {aba==="agendamentos" && (
          <div>
            <SecTitle>{"📅 Agendamentos"}</SecTitle>
            {isAdmin ? <Btn full onClick={function(){ setModalNovoAg(true); }} style={{ marginBottom:14 }}>{"+ Novo Agendamento"}</Btn> : null}
            {meuAgs.length===0
              ? <Empty icon={"📅"} title="Sem agendamentos" desc="Nenhum servico agendado ainda" />
              : meuAgs.map(function(ag){
                const st=statusAgendamento(ag);
                return (
                  <Card key={ag.id} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:6 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{ag.servico}</div>
                        <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{"📅 "}{fmtData(ag.data)}{" as "}{ag.hora}</div>
                        {ag.preco ? <div style={{ fontSize:13, fontWeight:800, color:"#059669", marginTop:2 }}>{"R$ "}{ag.preco}</div> : null}
                        {ag.obs ? <div style={{ fontSize:12, color:"#94a3b8", marginTop:4, fontStyle:"italic" }}>{ag.obs}</div> : null}
                      </div>
                      <Badge color={st.cor} bg={st.bg}>{st.label}</Badge>
                    </div>
                    {ag.status==="Agendado" && pet.tutorTel ? (
                      <Btn small onClick={function(){ enviarWhatsApp(pet.tutorTel, msgLembrete(ag,pet,db.empresa)); }} color="#25D366" style={{ marginTop:10 }}>{"📱 Enviar Lembrete"}</Btn>
                    ) : null}
                  </Card>
                );
              })
            }
          </div>
        )}

        {/* VACINAS */}
        {aba==="vacinas" && (
          <div>
            <SecTitle>{"💉 Vacinas"}</SecTitle>
            {(pet.vacinas||[]).length===0
              ? <Empty icon={"💉"} title="Sem vacinas" desc="Registre a primeira vacina" />
              : (pet.vacinas||[]).slice().reverse().map(function(v){
                return (
                  <Card key={v.id} style={{ marginBottom:10, display:"flex", gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:10, background:"#f5f3ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{"💉"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{v.nome}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:3, display:"flex", flexWrap:"wrap", gap:8 }}>
                        {v.data ? <span>{"📅 "}{fmtData(v.data)}</span> : null}
                        {v.dose ? <span>{"Dose: "}{v.dose}</span> : null}
                        {v.lote ? <span>{"Lote: "}{v.lote}</span> : null}
                      </div>
                      {v.proximo ? <div style={{ fontSize:12, color:"#f59e0b", marginTop:3 }}>{"Proximo: "}{fmtData(v.proximo)}</div> : null}
                      {v.vet ? <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{v.vet}</div> : null}
                    </div>
                    {isAdmin ? <button onClick={function(){ removeItem("vacinas",v.id); }} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"#ef4444", flexShrink:0 }}>{"🗑"}</button> : null}
                  </Card>
                );
              })
            }
            {isAdmin ? <Btn full onClick={function(){ abrirModal("vacina"); }}>{"+ Registrar Vacina"}</Btn> : null}
          </div>
        )}

        {/* MEDICACOES */}
        {aba==="medicacoes" && (
          <div>
            <SecTitle>{"💊 Medicacoes"}</SecTitle>
            {(pet.medicacoes||[]).length===0
              ? <Empty icon={"💊"} title="Sem medicacoes" desc="Registre uma medicacao" />
              : (pet.medicacoes||[]).slice().reverse().map(function(m){
                return (
                  <Card key={m.id} style={{ marginBottom:10, display:"flex", gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:10, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{"💊"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{m.nome}</div>
                      {m.posologia ? <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>{m.posologia}</div> : null}
                      <div style={{ fontSize:12, color:"#64748b", marginTop:3, display:"flex", flexWrap:"wrap", gap:8 }}>
                        {m.inicio ? <span>{"Inicio: "}{fmtData(m.inicio)}</span> : null}
                        {m.duracao ? <span>{m.duracao}{" dias"}</span> : null}
                      </div>
                      {m.obs ? <div style={{ fontSize:12, color:"#94a3b8", marginTop:4, fontStyle:"italic" }}>{m.obs}</div> : null}
                    </div>
                    {isAdmin ? <button onClick={function(){ removeItem("medicacoes",m.id); }} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"#ef4444", flexShrink:0 }}>{"🗑"}</button> : null}
                  </Card>
                );
              })
            }
            {isAdmin ? <Btn full onClick={function(){ abrirModal("med"); }}>{"+ Registrar Medicacao"}</Btn> : null}
          </div>
        )}

        {/* RECEITUARIOS */}
        {aba==="receituarios" && (
          <div>
            <SecTitle>{"📄 Receituarios"}</SecTitle>
            {(pet.receituarios||[]).length===0
              ? <Empty icon={"📄"} title="Sem receituarios" desc="Adicione um receituario" />
              : (pet.receituarios||[]).slice().reverse().map(function(r){
                return (
                  <Card key={r.id} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{r.titulo}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{"📅 "}{fmtData(r.data)}</div>
                      </div>
                      {isAdmin ? <button onClick={function(){ removeItem("receituarios",r.id); }} style={{ background:"#fee2e2", border:"none", borderRadius:8, padding:"4px 8px", cursor:"pointer", fontSize:12, color:"#ef4444" }}>{"🗑"}</button> : null}
                    </div>
                    {r.meds ? (
                      <div style={{ background:"#f8fafc", borderRadius:8, padding:10 }}>
                        {r.meds.split("\n").map(function(l,i,arr){ return <div key={i} style={{ fontSize:13, color:"#475569", padding:"4px 0", borderBottom: i<arr.length-1?"1px solid #e2e8f0":"none" }}>{"• "}{l}</div>; })}
                      </div>
                    ) : null}
                    {r.vet ? <div style={{ fontSize:12, color:"#64748b", marginTop:8 }}>{"👩‍⚕️ "}{r.vet}</div> : null}
                  </Card>
                );
              })
            }
            {isAdmin ? <Btn full onClick={function(){ abrirModal("rec"); }}>{"+ Adicionar Receituario"}</Btn> : null}
          </div>
        )}

        {/* EXAMES */}
        {aba==="exames" && (
          <div>
            <SecTitle>{"🔬 Exames"}</SecTitle>
            {(pet.exames||[]).length===0
              ? <Empty icon={"🔬"} title="Sem exames" desc="Registre exames solicitados" />
              : (pet.exames||[]).slice().reverse().map(function(ex){
                const sc=ex.status==="Concluido"?"#059669":ex.status==="Agendado"?"#0284c7":"#f59e0b";
                return (
                  <Card key={ex.id} style={{ marginBottom:10, display:"flex", gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:10, background:"#e0f2fe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{"🔬"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <div style={{ fontWeight:800, fontSize:15 }}>{ex.nome}</div>
                        <Badge color={sc}>{ex.status}</Badge>
                      </div>
                      <div style={{ fontSize:12, color:"#64748b" }}>{ex.data?fmtData(ex.data):""}{ex.vet?" · "+ex.vet:""}</div>
                      {ex.resultado ? <div style={{ fontSize:13, color:"#475569", marginTop:6, background:"#f8fafc", borderRadius:8, padding:"6px 10px" }}>{ex.resultado}</div> : null}
                    </div>
                    {isAdmin ? <button onClick={function(){ removeItem("exames",ex.id); }} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"#ef4444", flexShrink:0 }}>{"🗑"}</button> : null}
                  </Card>
                );
              })
            }
            {isAdmin ? <Btn full onClick={function(){ abrirModal("exame"); }}>{"+ Registrar Exame"}</Btn> : null}
          </div>
        )}

        {/* HISTORICO */}
        {aba==="historico" && (
          <div>
            <SecTitle>{"📁 Historico de Consultas"}</SecTitle>
            {(pet.consultas||[]).length===0
              ? <Empty icon={"📁"} title="Sem consultas" desc="Registre as consultas do pet" />
              : (
                <div style={{ position:"relative", paddingLeft:28 }}>
                  <div style={{ position:"absolute", left:10, top:8, bottom:8, width:2, background:"#e2e8f0" }} />
                  {(pet.consultas||[]).slice().reverse().map(function(c){
                    return (
                      <div key={c.id} style={{ position:"relative", marginBottom:14 }}>
                        <div style={{ position:"absolute", left:-24, top:12, width:12, height:12, borderRadius:"50%", background:"#7c3aed", border:"2px solid #fff", boxShadow:"0 0 0 2px #ede9fe" }} />
                        <Card style={{ padding:"12px 14px" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <div style={{ fontWeight:800, fontSize:14 }}>{c.tipo}</div>
                            <div style={{ fontSize:12, color:"#64748b" }}>{fmtData(c.data)}</div>
                          </div>
                          {c.desc ? <div style={{ fontSize:13, color:"#64748b" }}>{c.desc}</div> : null}
                          <div style={{ fontSize:12, color:"#94a3b8", marginTop:6, display:"flex", gap:10 }}>
                            {c.vet ? <span>{"👩‍⚕️ "}{c.vet}</span> : null}
                            {c.peso ? <span>{"⚖️ "}{c.peso}{" kg"}</span> : null}
                          </div>
                        </Card>
                        {isAdmin ? <button onClick={function(){ removeItem("consultas",c.id); }} style={{ position:"absolute", top:8, right:8, background:"#fee2e2", border:"none", borderRadius:6, padding:"2px 6px", cursor:"pointer", fontSize:11, color:"#ef4444" }}>{"🗑"}</button> : null}
                      </div>
                    );
                  })}
                </div>
              )
            }
            {isAdmin ? <Btn full onClick={function(){ abrirModal("consulta"); }}>{"+ Registrar Consulta"}</Btn> : null}
          </div>
        )}

        {/* PESO */}
        {aba==="peso" && (
          <div>
            <SecTitle>{"⚖️ Evolucao de Peso"}</SecTitle>
            <Card style={{ marginBottom:12 }}>
              <canvas ref={canvasRef} style={{ width:"100%", height:160 }} />
            </Card>
            {(pet.pesos||[]).slice().reverse().map(function(p,i,arr){
              const prev=arr[i+1];
              const diff=prev?(parseFloat(p.peso)-parseFloat(prev.peso)).toFixed(1):null;
              return (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14, padding:"10px 14px", background:"#f8fafc", borderRadius:10, marginBottom:8 }}>
                  <span style={{ color:"#64748b" }}>{"📅 "}{fmtData(p.data)}</span>
                  <span style={{ fontWeight:800 }}>{p.peso}{" kg"}</span>
                  {diff!==null ? <span style={{ fontWeight:700, color:parseFloat(diff)>0?"#ef4444":parseFloat(diff)<0?"#059669":"#64748b", fontSize:12 }}>{parseFloat(diff)>0?"+":""}{diff}</span> : null}
                  {isAdmin ? <button onClick={function(){ removeItem("pesos",p.id); }} style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"2px 6px", cursor:"pointer", fontSize:11, color:"#ef4444" }}>{"🗑"}</button> : null}
                </div>
              );
            })}
            {isAdmin ? <Btn full onClick={function(){ abrirModal("peso"); }}>{"+ Registrar Pesagem"}</Btn> : null}
          </div>
        )}

        {/* CODIGO */}
        {aba==="codigo" && isAdmin && (
          <div>
            <SecTitle>{"🔑 Codigo de Acesso"}</SecTitle>
            <div style={{ background:"linear-gradient(135deg,#f5f3ff,#ede9fe)", border:"2px solid #7c3aed", borderRadius:18, padding:24, textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", color:"#7c3aed", marginBottom:10 }}>{"Codigo do Tutor"}</div>
              <div style={{ fontFamily:"monospace", fontSize:42, fontWeight:900, color:"#7c3aed", letterSpacing:8 }}>{pet.codigo}</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:10 }}>Entregue ao tutor para acessar o cartao</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Btn full onClick={function(){ navigator.clipboard.writeText(pet.codigo); showToast("Codigo copiado!"); }}>{"📋 Copiar Codigo"}</Btn>
              {pet.tutorTel ? (
                <Btn full onClick={function(){
                  const msg="Ola "+pet.tutorNome+"! 🐾\n\nSeu pet *"+pet.nome+"* esta cadastrado no *"+(db.empresa.nome||"PetShop Pro")+"*!\n\n🔑 *Codigo de acesso:* "+pet.codigo+"\n\nUse este codigo no app para ver o cartao de saude digital do seu pet!";
                  enviarWhatsApp(pet.tutorTel,msg);
                }} color="#25D366">{"📱 Enviar por WhatsApp"}</Btn>
              ) : null}
            </div>
          </div>
        )}

      </div>

      {/* FAB */}
      {isAdmin ? (
        <button onClick={function(){ setModalFAB(true); }} style={{ position:"fixed", bottom:20, right:20, width:56, height:56, borderRadius:"50%", background:"#7c3aed", color:"#fff", border:"none", fontSize:28, cursor:"pointer", boxShadow:"0 6px 24px rgba(124,58,237,.4)", zIndex:80, display:"flex", alignItems:"center", justifyContent:"center" }}>{"+"}</button>
      ) : null}

      <Modal open={modalFAB} onClose={function(){ setModalFAB(false); }} title="Registrar">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["💉 Vacina","#7c3aed","vacina"],["💊 Medicacao","#059669","med"],["🔬 Exame","#0284c7","exame"],["📅 Consulta","#f97316","consulta"],["⚖️ Peso","#f59e0b","peso"],["📄 Receituario","#1e293b","rec"]].map(function(item){
            return <Btn key={item[2]} onClick={function(){ abrirModal(item[2]); }} color={item[1]} style={{ borderRadius:12 }}>{item[0]}</Btn>;
          })}
        </div>
      </Modal>

      {/* MODAL VACINA */}
      <Modal open={modalVacina} onClose={function(){ setModalVacina(false); }} title="Registrar Vacina">
        <Field label="Nome da Vacina"><Inp value={fVac.nome} onChange={function(e){ setFVac(function(f){ return Object.assign({},f,{nome:e.target.value}); }); }} placeholder="Ex: V10, Antirabica..." /></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Field label="Data"><Inp type="date" value={fVac.data} onChange={function(e){ setFVac(function(f){ return Object.assign({},f,{data:e.target.value}); }); }} /></Field>
          <Field label="Dose"><Inp value={fVac.dose} onChange={function(e){ setFVac(function(f){ return Object.assign({},f,{dose:e.target.value}); }); }} placeholder="1a dose" /></Field>
          <Field label="Lote"><Inp value={fVac.lote} onChange={function(e){ setFVac(function(f){ return Object.assign({},f,{lote:e.target.value}); }); }} placeholder="AB2026-001" /></Field>
          <Field label="Proximo Reforco"><Inp type="date" value={fVac.proximo} onChange={function(e){ setFVac(function(f){ return Object.assign({},f,{proximo:e.target.value}); }); }} /></Field>
        </div>
        <Field label="Veterinario"><Inp value={fVac.vet} onChange={function(e){ setFVac(function(f){ return Object.assign({},f,{vet:e.target.value}); }); }} placeholder="Nome" /></Field>
        <Btn full onClick={function(){ if(!fVac.nome){alert("Nome obrigatorio"); return;} addItem("vacinas",fVac); setModalVacina(false); }}>{"Salvar Vacina"}</Btn>
      </Modal>

      {/* MODAL MED */}
      <Modal open={modalMed} onClose={function(){ setModalMed(false); }} title="Registrar Medicacao">
        <Field label="Medicamento"><Inp value={fMed.nome} onChange={function(e){ setFMed(function(f){ return Object.assign({},f,{nome:e.target.value}); }); }} placeholder="Ex: Amoxicilina 250mg" /></Field>
        <Field label="Posologia"><Inp value={fMed.posologia} onChange={function(e){ setFMed(function(f){ return Object.assign({},f,{posologia:e.target.value}); }); }} placeholder="1 cp a cada 12h" /></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Field label="Inicio"><Inp type="date" value={fMed.inicio} onChange={function(e){ setFMed(function(f){ return Object.assign({},f,{inicio:e.target.value}); }); }} /></Field>
          <Field label="Duracao (dias)"><Inp type="number" value={fMed.duracao} onChange={function(e){ setFMed(function(f){ return Object.assign({},f,{duracao:e.target.value}); }); }} placeholder="7" /></Field>
        </div>
        <Field label="Veterinario"><Inp value={fMed.vet} onChange={function(e){ setFMed(function(f){ return Object.assign({},f,{vet:e.target.value}); }); }} placeholder="Nome" /></Field>
        <Field label="Obs"><Inp rows={2} value={fMed.obs} onChange={function(e){ setFMed(function(f){ return Object.assign({},f,{obs:e.target.value}); }); }} placeholder="Em jejum..." /></Field>
        <Btn full onClick={function(){ if(!fMed.nome){alert("Nome obrigatorio"); return;} addItem("medicacoes",fMed); setModalMed(false); }}>{"Salvar Medicacao"}</Btn>
      </Modal>

      {/* MODAL EXAME */}
      <Modal open={modalExame} onClose={function(){ setModalExame(false); }} title="Registrar Exame">
        <Field label="Tipo de Exame"><Inp value={fExm.nome} onChange={function(e){ setFExm(function(f){ return Object.assign({},f,{nome:e.target.value}); }); }} placeholder="Ex: Hemograma..." /></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Field label="Data"><Inp type="date" value={fExm.data} onChange={function(e){ setFExm(function(f){ return Object.assign({},f,{data:e.target.value}); }); }} /></Field>
          <Field label="Status"><Sel value={fExm.status} onChange={function(e){ setFExm(function(f){ return Object.assign({},f,{status:e.target.value}); }); }} options={["Pendente","Agendado","Concluido"]} /></Field>
        </div>
        <Field label="Resultado"><Inp rows={2} value={fExm.resultado} onChange={function(e){ setFExm(function(f){ return Object.assign({},f,{resultado:e.target.value}); }); }} placeholder="Resultado..." /></Field>
        <Field label="Veterinario"><Inp value={fExm.vet} onChange={function(e){ setFExm(function(f){ return Object.assign({},f,{vet:e.target.value}); }); }} placeholder="Solicitado por..." /></Field>
        <Btn full onClick={function(){ if(!fExm.nome){alert("Nome obrigatorio"); return;} addItem("exames",fExm); setModalExame(false); }}>{"Salvar Exame"}</Btn>
      </Modal>

      {/* MODAL CONSULTA */}
      <Modal open={modalConsulta} onClose={function(){ setModalConsulta(false); }} title="Registrar Consulta">
        <Field label="Tipo"><Sel value={fCon.tipo} onChange={function(e){ setFCon(function(f){ return Object.assign({},f,{tipo:e.target.value}); }); }} options={["Consulta de rotina","Consulta de emergencia","Vacinacao","Retorno","Cirurgia","Internacao","Outro"]} /></Field>
        <Field label="Data"><Inp type="date" value={fCon.data} onChange={function(e){ setFCon(function(f){ return Object.assign({},f,{data:e.target.value}); }); }} /></Field>
        <Field label="Descricao / Diagnostico"><Inp rows={3} value={fCon.desc} onChange={function(e){ setFCon(function(f){ return Object.assign({},f,{desc:e.target.value}); }); }} placeholder="Resumo da consulta..." /></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Field label="Veterinario"><Inp value={fCon.vet} onChange={function(e){ setFCon(function(f){ return Object.assign({},f,{vet:e.target.value}); }); }} placeholder="Nome" /></Field>
          <Field label="Peso (kg)"><Inp type="number" value={fCon.peso} onChange={function(e){ setFCon(function(f){ return Object.assign({},f,{peso:e.target.value}); }); }} placeholder="4.5" /></Field>
        </div>
        <Btn full onClick={function(){
          addItem("consultas",fCon);
          if(fCon.peso) addItem("pesos",{peso:fCon.peso,data:fCon.data,local:(db.empresa&&db.empresa.nome)||"",obs:"Registrado na consulta"});
          setModalConsulta(false);
        }}>{"Salvar Consulta"}</Btn>
      </Modal>

      {/* MODAL PESO */}
      <Modal open={modalPeso} onClose={function(){ setModalPeso(false); }} title="Registrar Pesagem">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Field label="Peso (kg)"><Inp type="number" value={fPes.peso} onChange={function(e){ setFPes(function(f){ return Object.assign({},f,{peso:e.target.value}); }); }} placeholder="4.8" /></Field>
          <Field label="Data"><Inp type="date" value={fPes.data} onChange={function(e){ setFPes(function(f){ return Object.assign({},f,{data:e.target.value}); }); }} /></Field>
        </div>
        <Field label="Local"><Inp value={fPes.local} onChange={function(e){ setFPes(function(f){ return Object.assign({},f,{local:e.target.value}); }); }} placeholder="Clinica..." /></Field>
        <Btn full onClick={function(){ if(!fPes.peso){alert("Peso obrigatorio"); return;} addItem("pesos",fPes); setModalPeso(false); }}>{"Salvar Pesagem"}</Btn>
      </Modal>

      {/* MODAL RECEITUARIO */}
      <Modal open={modalRec} onClose={function(){ setModalRec(false); }} title="Adicionar Receituario">
        <Field label="Titulo"><Inp value={fRec.titulo} onChange={function(e){ setFRec(function(f){ return Object.assign({},f,{titulo:e.target.value}); }); }} placeholder="Ex: Consulta - Gastrite" /></Field>
        <Field label="Data"><Inp type="date" value={fRec.data} onChange={function(e){ setFRec(function(f){ return Object.assign({},f,{data:e.target.value}); }); }} /></Field>
        <Field label="Medicamentos e Instrucoes (uma por linha)"><Inp rows={4} value={fRec.meds} onChange={function(e){ setFRec(function(f){ return Object.assign({},f,{meds:e.target.value}); }); }} placeholder={"Amoxicilina 250mg - 2x ao dia\nDieta leve..."} /></Field>
        <Field label="Veterinario - CRMV"><Inp value={fRec.vet} onChange={function(e){ setFRec(function(f){ return Object.assign({},f,{vet:e.target.value}); }); }} placeholder="Dr(a). Nome - CRMV 12345" /></Field>
        <Btn full onClick={function(){ if(!fRec.titulo){alert("Titulo obrigatorio"); return;} addItem("receituarios",fRec); setModalRec(false); }}>{"Salvar Receituario"}</Btn>
      </Modal>

      {/* MODAL NOVO AGENDAMENTO DO PET */}
      <ModalAgendamento
        open={modalNovoAg}
        onClose={function(){ setModalNovoAg(false); }}
        onSave={function(form){
          const agForm = Object.assign({},form,{petId:String(pet.id)});
          const ag = Object.assign({},agForm,{id:Date.now()});
          const novoAgs = db.agendamentos.concat([ag]);
          const novoDb = Object.assign({},db,{agendamentos:novoAgs});
          onUpdateDB(novoDb);
          if(form.lembrete && pet.tutorTel) enviarWhatsApp(pet.tutorTel, msgConfirmacao(ag,pet,db.empresa));
          showToast("Agendamento criado!");
          setModalNovoAg(false);
        }}
        pets={[pet]}
        servicos={db.servicos}
        agEdit={null}
      />

      {/* EDIT PET */}
      <ModalPet open={editando} onClose={function(){ setEditando(false); }} petEdit={pet} onSave={function(form){ update(Object.assign({},pet,form)); showToast("Cadastro atualizado!"); }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [tela, setTela] = useState("loading");
  const [db, setDB] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [petId, setPetId] = useState(null);

  useEffect(function(){
    loadDB().then(function(d){ setDB(d); setTela("login"); });
  },[]);

  async function persist(novoDB) {
  setDb(novoDB);       // Atualiza a tela imediatamente
  await saveDB(novoDB); // Envia para o banco de dados na nuvem
}

  function handleAdmin(){ setIsAdmin(true); setTela("admin"); }

  function handleTutor(codigo, setErro){
    const pet = db.pets.find(function(p){ return p.codigo===codigo; });
    if(!pet){ setErro("Codigo nao encontrado. Verifique e tente novamente."); return; }
    setPetId(pet.id); setIsAdmin(false); setTela("pet");
  }

  async function handleUpdatePet(atualizado){
    const novo = Object.assign({},db,{ pets: db.pets.map(function(p){ return p.id===atualizado.id ? atualizado : p; }) });
    await persist(novo);
  }

  const petAtual = db && db.pets.find(function(p){ return p.id===petId; });

  if(tela==="loading") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, background:"linear-gradient(135deg,#1e293b,#312e81)" }}>
      <div style={{ fontSize:60 }}>{"🐾"}</div>
      <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, color:"#fff", fontSize:20 }}>{"Carregando PetShop Pro..."}</div>
    </div>
  );

  return (
    <div>
      <style>{CSS}</style>
      {tela==="login" && <TelaLogin onAdmin={handleAdmin} onTutor={handleTutor} />}
      {tela==="admin" && db && (
        <AdminPanel
          db={db}
          onSelectPet={function(id){ setPetId(id); setTela("pet"); setIsAdmin(true); }}
          onLogout={function(){ setIsAdmin(false); setTela("login"); }}
          onUpdateDB={persist}
        />
      )}
      {tela==="pet" && petAtual && db && (
        <CartaoPet
          pet={petAtual}
          db={db}
          isAdmin={isAdmin}
          onBack={function(){ isAdmin ? setTela("admin") : setTela("login"); }}
          onUpdatePet={handleUpdatePet}
          onUpdateDB={persist}
        />
      )}
    </div>
  );
}
