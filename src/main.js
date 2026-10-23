import { createClient } from "@supabase/supabase-js";

(function(){
var MES=ymLocal(), MES_LABEL='', COND='', CONDO_ID='', USER=null, DB_READY=false, BLOCK_IDS={}, CURRENT_MORADOR=null, RESIDENT_INVITES={};
var supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
var supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
var supabase=(supabaseUrl&&supabaseKey)?createClient(supabaseUrl,supabaseKey):null;
var brl=function(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uid=function(){return crypto.randomUUID()};
function padd(n){return String(n).padStart(2,'0')}
function ymLocal(){var d=new Date();return d.getFullYear()+'-'+padd(d.getMonth()+1)}
function todayLocal(){var d=new Date();return d.getFullYear()+'-'+padd(d.getMonth()+1)+'-'+padd(d.getDate())}
function safeName(n){return String(n||'arquivo').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').slice(-120)}
var now=function(){var d=new Date();return todayLocal()+'T'+padd(d.getHours())+':'+padd(d.getMinutes())};
var fmtDT=function(s){if(!s)return '';var d=new Date(s);return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
var fmtD=function(s){var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]};

function seed(){return {config:{tarifaGas:0,tarifaAgua:0,taxaCondominio:0,vencimentoDia:10,contaAgua:0,modoAgua:'consumo',cobrarAluguel:false,contaMes:{},tarifaMes:{}},prestadores:[],veiculos:[],meios:[],pagamentos:[],taxas:[],unidades:[],historico:[],despesas:[],visitantes:[],encomendas:[],comunicados:[],chamados:[]}}
var S=seed();
var saveQueue=Promise.resolve();
var PORTARIA_CONFIG={habilitada:false,equipe:[]},PORTARIA_CONFIG_ERROR='',portariaCheckTimer=null;
var MP_CONFIG={mode:null,method:null,mercadoPago:{publicKey:'',pix:true,cartao:true,boleto:true,hasAccessToken:false}}, MP_CONFIG_ERROR='';
async function refreshPaymentConfig(){
  if(!supabase||!USER)return;
  var result=await supabase.functions.invoke('payment-config',{body:{action:'get'}});
  if(result.error){MP_CONFIG={mode:null,method:null,mercadoPago:{publicKey:'',pix:true,cartao:true,boleto:true,hasAccessToken:false}};MP_CONFIG_ERROR='A configuração segura de pagamentos ainda não está disponível. Aplique a migração e publique a Edge Function payment-config.';return}
  MP_CONFIG_ERROR='';MP_CONFIG=result.data||MP_CONFIG;
  if(MP_CONFIG.method){var m=MP_CONFIG.method;S.meios=[{id:m.id,nome:m.nome,tipo:m.tipo,ativo:true,dados:m.dados_publicos||{},instrucoes:m.instrucoes||''}]}
  else S.meios=[];
}
var savePending=false;
function save(){if(!DB_READY||role==='morador'||savePending)return;savePending=true;saveQueue=saveQueue.catch(function(){}).then(function(){savePending=false;return role==='portaria'?persistPortariaWorkspace():persistWorkspace()}).catch(function(e){flash('Não foi possível salvar no banco: '+(e.message||e))})}

var role='sindico', view='dashboard', toastMsg='', financeTab='cobrancas', unitTab='apartamentos', activeBlock='', activeUnitId='', editingTenant=false;
var MY='A-302';
var finQ='',finSt='todos',unitQ='',THEME='auto',RECOVERY=/type=recovery/.test(location.hash),authEmail='';
var NAV={
  sindico:[['dashboard','Painel'],['unidades','Unidades e moradores'],['acessos','Acessos dos moradores'],['financeiro','Financeiro'],['taxas','Taxas adicionais'],['leituras','Leituras e rateios'],['portaria','Portaria'],['equipe_portaria','Equipe da portaria'],['comunicacao','Comunicados e chamados']],
  portaria:[['portaria','Portaria'],['comunicacao','Comunicados']],
  morador:[['minha','Início'],['pagamentos','Pagamentos'],['chamados','Chamados'],['encomendas','Encomendas'],['comunicacao','Comunicados']]
};
var ROLE_LABEL={sindico:'Síndico',portaria:'Portaria',morador:'Morador'};
var uLabel=function(u){return u.bloco+'-'+u.apto};
var splitNames=function(value){return String(value||'').split(/[,\n;]/).map(function(name){return name.trim()}).filter(Boolean)};
var splitPhones=function(value){return String(value||'').split(/\r?\n/).map(function(phone){return phone.trim()})};
var unitByLabel=function(l){return S.unidades.filter(function(u){return uLabel(u)===l})[0]};
var paid=function(u){return !!u.pago[MES]};
var dueDay=function(){return Math.max(1,Math.min(28,Number(S.config.vencimentoDia||10)))};
var dueDate=function(mes){return mes+'-'+padd(dueDay())};
var isLate=function(mes){return todayLocal()>dueDate(mes)};
function lateFor(){if(role==='morador'){var ds=cobrancaMorador(MES).items.map(function(x){return x.vencimento}).filter(Boolean).sort();return todayLocal()>(ds[0]||dueDate(MES))}return isLate(MES)}
var r2=function(v){return Math.round(v*100)/100};
var NOMES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MESES=(function(){var out=[],d=new Date(),y=d.getFullYear(),m=d.getMonth()-12;for(var i=0;i<25;i++){var yy=y+Math.floor(m/12),mm=((m%12)+12)%12+1;out.push(yy+'-'+padd(mm));m++}return out})();
var mesLabel=function(m){return NOMES[+m.slice(5)-1]+'/'+m.slice(0,4)};
var mesCurto=function(m){return NOMES[+m.slice(5)-1].slice(0,3)+'/'+m.slice(2,4)};
var setMes=function(m){MES=m;MES_LABEL=mesLabel(m)};
var prevMes=function(m){var y=+m.slice(0,4),mo=+m.slice(5)-1;if(mo<1){mo=12;y--}return y+'-'+(mo<10?'0':'')+mo};
/* Leitura do mês: anterior = atual do mês passado (quando existe); sem registro no mês, consumo zero. */
var getRead=function(u,k,mes){var L=u.leituras&&u.leituras[mes],p=u.leituras&&u.leituras[prevMes(mes)];
  var pa=p&&p[k]?p[k][1]:null,cur=L&&L[k]?L[k]:null;
  var ant=pa!=null?pa:(cur?cur[0]:0),at=cur?cur[1]:ant;return [ant,at,!!cur,pa!=null]};
var leiM=function(u,k,m){var r=getRead(u,k,m);return Math.max(0,r[1]-r[0])};
var lei=function(u,k){return leiM(u,k,MES)};
var contaAguaDe=function(m){var v=S.config.contaMes[m];return v!=null?v:S.config.contaAgua};
var tarifaDe=function(m){var v=S.config.tarifaMes[m];return v!=null?v:S.config.tarifaGas};
var despMes=function(){return S.despesas.filter(function(d){return d.data.slice(0,7)===MES})};
var calcAgua=function(u){var c=S.config,tot=0,n=0,conta=contaAguaDe(MES);
  S.unidades.forEach(function(x){tot+=lei(x,'agua');if(x.situacao!=='Vago')n++});
  if(c.modoAgua==='individual')return r2(lei(u,'agua')*Number(c.tarifaAgua||0));
  if(c.modoAgua==='consumo')return tot>0?r2(conta*lei(u,'agua')/tot):0;
  return u.situacao!=='Vago'&&n>0?r2(conta/n):0};
/* Taxas adicionais: valor fixo por apartamento ou valor total rateado, para todas, ocupadas ou unidades escolhidas, dentro de uma vigência. */
var taxaVigente=function(t,mes){return mes>=t.inicio&&(!t.fim||mes<=t.fim)};
var taxaAlvo=function(t){return S.unidades.filter(function(x){return t.aplica==='todas'||(t.aplica==='ocupadas'&&x.situacao!=='Vago')||(t.aplica==='selecionadas'&&t.unidades.indexOf(x.id)>-1)})};
var taxaValor=function(t,u,mes){if(!taxaVigente(t,mes))return 0;var alvo=taxaAlvo(t);if(alvo.indexOf(u)<0)return 0;return t.modo==='rateio'?r2(t.valor/alvo.length):r2(t.valor)};
var extrasDe=function(u,mes){return S.taxas.map(function(t){return {nome:t.nome,valor:taxaValor(t,u,mes)}}).filter(function(e){return e.valor>0})};
/* Uma coluna por taxa adicional vigente no mês, com o nome cadastrado pelo síndico. */
var taxasMes=function(){return S.taxas.filter(function(t){return taxaVigente(t,MES)})};
var thTaxas=function(){return taxasMes().map(function(t){return '<th>'+esc(t.nome)+'</th>'}).join('')};
var tdTaxas=function(u){return taxasMes().map(function(t){var v=taxaValor(t,u,MES);return '<td class="num">'+(v?brl(v):'—')+'</td>'}).join('')};
var cobranca=function(u){var alu=u.aluguel||0,t=Number(S.config.taxaCondominio||u.taxa||0),a=calcAgua(u),g=r2(lei(u,'gas')*tarifaDe(MES));
  var ex=extrasDe(u,MES),sx=r2(ex.reduce(function(s,e){return s+e.valor},0));
  return {taxa:t,agua:a,gas:g,extras:ex,extrasTotal:sx,aluguel:alu,total:r2(t+a+g+sx+(S.config.cobrarAluguel?alu:0))}};
function cobrancaMorador(mes){var base=(S.residentCharges||[]).filter(function(x){return x.competencia===mes+'-01'}),extra=(S.residentExtraCharges||[]).filter(function(x){return x.competencia===mes+'-01'}),items=base.concat(extra).map(function(x){return {descricao:x.descricao||'Cobrança',valor:Number(x.valor||0),status:x.status||'pendente',vencimento:x.vencimento||''}});return {items:items,total:r2(items.reduce(function(sum,x){return sum+x.valor},0)),paid:items.length>0&&items.every(function(x){return x.status==='pago'})}}
var totalEsperado=function(){return S.unidades.reduce(function(a,u){return a+cobranca(u).total},0)};
var totalArrecadado=function(){return S.unidades.reduce(function(a,u){return a+(paid(u)?cobranca(u).total:0)},0)};
var totalDespesas=function(){return despMes().reduce(function(a,d){return a+d.valor},0)};
function cobrancaTexto(f){var c=cobranca(f);return 'Olá, '+(f.dono||f.morador)+'. Cobrança de '+MES_LABEL+' da unidade '+uLabel(f)+': taxa '+brl(c.taxa)+', água '+brl(c.agua)+', gás '+brl(c.gas)+c.extras.map(function(e){return ', '+e.nome.toLowerCase()+' '+brl(e.valor)}).join('')+(S.config.cobrarAluguel&&c.aluguel?', aluguel '+brl(c.aluguel):'')+'. Total '+brl(c.total)+', com vencimento em '+fmtD(dueDate(MES))+'. Pedimos a regularização. Administração do '+COND+'.'}
function waCobranca(u){var d=String(u.tel||'').replace(/\D/g,'');if(d.length<10)return '';if(d.length<=11)d='55'+d;return 'https://wa.me/'+d+'?text='+encodeURIComponent(cobrancaTexto(u))}
function unitOptions(){return S.unidades.map(function(u){return '<option>'+esc(uLabel(u))+'</option>'}).join('')}
function flash(m){var d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2600)}
function toast(m){toastMsg=m;render();setTimeout(function(){toastMsg='';var t=document.querySelector('#app .toast');if(t)t.remove()},2200)}

function applyTheme(){var r=document.documentElement;if(THEME==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',THEME)}
function themeLabel(){return THEME==='dark'?'escuro':THEME==='light'?'claro':'automático'}
try{THEME=localStorage.getItem('condogestor-theme')||'auto'}catch(x){}
function shell(){
  var items=NAV[role].filter(function(i){return role!=='sindico'||i[0]!=='portaria'||PORTARIA_CONFIG.habilitada});
  if(!items.some(function(i){return i[0]===view}))view=items[0][0];
  var pend=S.encomendas.filter(function(e){return !e.retirada}).length;
  var navHtml=items.map(function(i){
    var c=''; if(i[0]==='portaria'&&role!=='morador')c='<span class="count">'+pend+'</span>';
    if(i[0]==='financeiro'){var pp=S.pagamentos.filter(function(x){return x.status==='Aguardando conferência'}).length;if(pp)c='<span class="count">'+pp+'</span>'}
    return '<button data-nav="'+i[0]+'"'+(i[0]===view?' aria-current="page"':'')+'>'+i[1]+c+'</button>'}).join('');
  var resident=role==='morador';
  var residentIcons={
    minha:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    pagamentos:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    chamados:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.8-.95L4 20l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/></svg>',
    encomendas:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/></svg>',
    comunicacao:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>'
  };
  var mobileLabels={minha:'Início',pagamentos:'Pagar',chamados:'Chamados',encomendas:'Encomendas',comunicacao:'Avisos'};
  var mobileNav=resident?'<nav class="resident-bottom-nav" aria-label="Navegação do morador">'+items.map(function(i){return '<button data-nav="'+i[0]+'"'+(i[0]===view?' aria-current="page"':'')+'>'+residentIcons[i[0]]+'<span>'+mobileLabels[i[0]]+'</span></button>'}).join('')+'</nav>':'';
  var residentHeader=resident?'<header class="resident-app-header"><div class="resident-app-brand"><div class="brand-mark">C</div><div><b>CondoGestor</b><small>'+esc(COND)+'</small></div></div><label class="resident-month"><span>Mês</span><select id="mes">'+MESES.map(function(m){return '<option value="'+m+'"'+(m===MES?' selected':'')+'>'+mesLabel(m)+'</option>'}).join('')+'</select></label></header>':'';
  var body={dashboard:vDash,unidades:vUnits,acessos:vAccesses,financeiro:vFin,leituras:vLeit,taxas:vTaxas,portaria:vPortaria,equipe_portaria:vEquipePortaria,comunicacao:vComm,minha:vMinha,pagamentos:vTenantPayment,chamados:function(){return vTenantCalls(MY)},encomendas:vTenantEncomendas}[view]();
  return '<aside><div class="brand"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>'+esc(COND)+'</small></div></div>'+
    '<div class="roles"><label>Sessão</label><button class="btn ghost sm" data-signout>Sair de '+esc(USER&&USER.email||'')+'</button><button class="btn ghost sm" type="button" data-theme-toggle>Tema: '+themeLabel()+'</button></div>'+
    (resident?'':'<div class="roles"><label for="mes">Mês de referência</label><select id="mes">'+MESES.map(function(m){return '<option value="'+m+'"'+(m===MES?' selected':'')+'>'+mesLabel(m)+'</option>'}).join('')+'</select></div>')+'<nav>'+navHtml+'</nav></aside><main class="'+(resident?'resident-main':'')+'">'+residentHeader+body+mobileNav+'</main>'+(toastMsg?'<div class="toast" role="status">'+esc(toastMsg)+'</div>':'');
}
function todoCard(label,n,nav,tab){return '<button type="button" class="todo'+(n?' has':'')+'" data-nav="'+nav+'"'+(tab?' data-ftab-set="'+tab+'"':'')+'><b>'+n+'</b><span>'+label+'</span></button>'}
function head(t,p){return '<div class="head"><div><h2>'+t+'</h2><p>'+p+'</p></div></div>'}

var authMode='login', authNotice='';
function setShell(on){var app=document.getElementById('app');if(app)app.className=on?'shell':'auth'}
function renderAuth(){
  var app=document.getElementById('app');
  setShell(false);
  if(!supabase){app.innerHTML='<main style="max-width:620px;margin:8vh auto;padding:0 16px;width:100%"><div class="panel auth-card"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>Gestão simples do seu condomínio</small></div></div><h2>Sistema indisponível</h2><p class="note">O acesso ao banco de dados não está configurado neste ambiente. Configure as variáveis do Supabase para habilitar cadastro e login.</p></div></main>';return}
  var reg=authMode==='register',hasInvite=!!inviteTokenFromUrl();
  app.innerHTML='<main style="max-width:620px;margin:8vh auto;padding:0 16px;width:100%"><div class="panel auth-card"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>Gestão simples do seu condomínio</small></div></div><h2 style="margin-bottom:6px">'+(reg?'Cadastre seu condomínio':'Entrar no sistema')+'</h2><p class="note">'+(reg?'Crie o acesso do síndico e configure as cobranças padrão.':(hasInvite?'Entre com o e-mail convidado para vincular seu acesso ao apartamento.':'Acesse com seu e-mail e senha. Porteiros, vigilantes e moradores entram com o acesso enviado pelo síndico.'))+'</p>'+(authNotice?'<p class="pill warn" style="margin:10px 0">'+esc(authNotice)+'</p>':'')+
  '<form class="f" id="f-auth">'+(reg?'<label>Seu nome<input id="a-nome" required autocomplete="name"></label><label>Nome do condomínio<input id="a-cond" required></label><label>CNPJ (opcional)<input id="a-cnpj" inputmode="numeric"></label><label class="wide">Endereço (opcional)<input id="a-endereco" autocomplete="street-address"></label><label>Telefone do condomínio<input id="a-telefone" type="tel"></label><label>Taxa de condomínio mensal por apartamento (R$)<input id="a-taxa" type="number" min="0" step="0.01" value="0" required><small>Esse valor será cobrado de cada apartamento ocupado.</small></label><label>Vencimento da cobrança (dia)<input id="a-venc" type="number" min="1" max="28" value="10" required></label><label>Água<select id="a-agua"><option value="rateio">Rateio da conta do condomínio</option><option value="individual">Medidor e cobrança individual</option></select></label><label>Tarifa água (R$/m³)<input id="a-agua-tarifa" type="number" min="0" step="0.0001" value="0"></label><label>Tarifa gás (R$/m³)<input id="a-gas" type="number" min="0" step="0.0001" value="0"></label>':'')+
  '<label>E-mail<input id="a-email" type="email" required autocomplete="email" value="'+esc(authEmail)+'"></label><label>Senha<input id="a-password" type="password" required minlength="8" autocomplete="'+(reg?'new-password':'current-password')+'"></label><button class="btn" type="submit">'+(reg?'Criar conta e condomínio':'Entrar')+'</button></form>'+(reg?'':'<button class="btn ghost" type="button" data-forgot>Esqueci minha senha</button> ')+(hasInvite?'':'<button class="btn ghost" type="button" data-auth-mode>'+(reg?'Já tenho uma conta':'Criar uma conta de síndico')+'</button>')+'</div></main>';
}
function renderLoading(message){setShell(false);document.getElementById('app').innerHTML='<main class="panel" style="max-width:620px;margin:12vh auto;width:100%"><h2>CondoGestor</h2><p>'+esc(message)+'</p></main>'}
var pendingInviteToken='';
function inviteTokenFromUrl(){return new URLSearchParams(location.search).get('convite')||''}
function clearInviteTokenFromUrl(){var url=new URL(location.href);url.searchParams.delete('convite');history.replaceState({},'',url.pathname+url.search+url.hash)}
function renderResidentPassword(notice){
  setShell(false);var app=document.getElementById('app');
  app.innerHTML='<main style="max-width:480px;margin:10vh auto;padding:0 16px;width:100%"><div class="panel auth-card"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>Ative seu acesso de morador</small></div></div><h2>Crie sua senha</h2><p class="note">Depois de definir a senha, você poderá entrar no aplicativo com este e-mail.</p>'+(notice?'<p class="pill warn" style="margin:10px 0">'+esc(notice)+'</p>':'')+'<form class="f" id="f-resident-password"><label>Nova senha<input id="resident-new-password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirme a senha<input id="resident-confirm-password" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn" type="submit">Definir senha e acessar</button></form><button class="btn ghost" type="button" data-signout>Sair desta conta</button></div></main>';
}
function renderRecovery(notice){
  setShell(false);var app=document.getElementById('app');
  app.innerHTML='<main style="max-width:480px;margin:10vh auto;padding:0 16px;width:100%"><div class="panel auth-card"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>Redefinir senha</small></div></div><h2>Crie uma nova senha</h2><p class="note">Digite a nova senha para voltar a acessar o sistema.</p>'+(notice?'<p class="pill warn" style="margin:10px 0">'+esc(notice)+'</p>':'')+'<form class="f" id="f-recovery"><label>Nova senha<input id="recovery-new-password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirme a senha<input id="recovery-confirm-password" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn" type="submit">Salvar nova senha</button></form></div></main>';
}
async function acceptResidentInvite(session,token){
  var accepted=await supabase.rpc('aceitar_convite',{_token:token});if(accepted.error)throw accepted.error;
  await supabase.auth.updateUser({data:{sercon_convite_token:null}});
  clearInviteTokenFromUrl();pendingInviteToken='';await loadWorkspace(session);
}
async function enterWorkspace(session){
  var metadataToken=session.user&&session.user.user_metadata&&session.user.user_metadata.sercon_convite_token;
  var urlToken=inviteTokenFromUrl();
  if(metadataToken){pendingInviteToken=metadataToken;renderResidentPassword('');return}
  if(urlToken){renderLoading('Confirmando convite…');await acceptResidentInvite(session,urlToken);return}
  await loadWorkspace(session);
}
function dbRows(table){return supabase.from(table).select('*').then(function(r){if(r.error)throw r.error;return r.data||[]})}
async function refreshPortariaConfig(){
  if(!supabase||!USER)return;
  var result=await supabase.functions.invoke('portaria-equipe',{body:{action:'get'}});
  if(result.error){PORTARIA_CONFIG={habilitada:false,equipe:[]};PORTARIA_CONFIG_ERROR='Não foi possível carregar as configurações da portaria. Publique as funções e aplique as migrações.';return}
  PORTARIA_CONFIG=result.data||{habilitada:false,equipe:[]};PORTARIA_CONFIG_ERROR='';
}
async function loadPortariaWorkspace(session,profile){
  if(portariaCheckTimer)clearInterval(portariaCheckTimer);
  var result=await supabase.functions.invoke('portaria-workspace',{body:{action:'list'}});
  if(result.error)throw result.error;
  if(result.data&&result.data.error)throw new Error(result.data.error);
  var data=result.data||{};if(!data.habilitada)throw new Error('O síndico desabilitou o módulo Portaria.');
  CONDO_ID=profile.condominio_id;COND=(data.condominio&&data.condominio.nome)||'Condomínio';
  S=seed();S.unidades=(data.unidades||[]).map(function(u){var residents=u.moradores||[];return {id:u.id,bloco:u.bloco||'',apto:u.numero||'',dono:'',morador:residents.map(function(m){return m.nome}).join(', ')||'—',tel:(residents.find(function(m){return m.telefone})||{}).telefone||'—',situacao:'Ocupado',taxa:0,aluguel:0,leituras:{},pago:{}}});
  var labelById={};S.unidades.forEach(function(u){labelById[u.id]=uLabel(u)});
  S.visitantes=(data.visitantes||[]).map(function(x){return {id:x.id,nome:x.nome,doc:x.documento||'',unidade:labelById[x.unidade_id]||'',entrada:x.entrada_em,saida:x.saida_em||''}});
  S.prestadores=(data.prestadores||[]).map(function(x){return {id:x.id,nome:x.nome,empresa:x.empresa||'',servico:x.servico,doc:x.documento||'',unidade:labelById[x.unidade_id]||'',autorizado:x.autorizado_por||'',entrada:x.entrada_em,saida:x.saida_em||''}});
  S.veiculos=(data.veiculos||[]).map(function(x){return {id:x.id,placa:x.placa,modelo:x.modelo,cor:x.cor||'',tipo:x.tipo==='morador'?'Morador':x.tipo==='visitante'?'Visitante':'Prestador',unidade:labelById[x.unidade_id]||'',vaga:x.vaga||'',entrada:x.entrada_em||'',saida:x.saida_em||''}});
  S.encomendas=(data.encomendas||[]).map(function(x){return {id:x.id,unidade:labelById[x.unidade_id]||'',transp:x.transportadora||'',chegada:x.chegada_em,retirada:x.retirada_em||'',avisado:x.avisado_em||''}});
  S.comunicados=(data.comunicados||[]).map(function(x){return {id:x.id,titulo:x.titulo,texto:x.conteudo,data:(x.criado_em||'').slice(0,10)}});
  DB_READY=true;role='portaria';setMes(MES);view='portaria';render();
  portariaCheckTimer=setInterval(async function(){
    var check=await supabase.functions.invoke('portaria-workspace',{body:{action:'list'}});
    var denied=check.data&&check.data.error==='O síndico desabilitou o módulo Portaria.';
    if(check.error&&check.error.context&&check.error.context.status===403)denied=true;
    if(denied){clearInterval(portariaCheckTimer);portariaCheckTimer=null;DB_READY=false;S=seed();authNotice='O síndico desabilitou o módulo Portaria ou removeu seu acesso.';renderAuth()}
  },30000);
}
async function loadResidentWorkspace(session,profile){
  CONDO_ID=profile.condominio_id;
  var residentResult=await supabase.from('moradores').select('*').eq('user_id',USER.id).eq('condominio_id',CONDO_ID).eq('tipo','inquilino').maybeSingle();
  if(residentResult.error)throw residentResult.error;
  var resident=residentResult.data;
  if(!resident||!resident.unidade_id)throw new Error('Esta conta ainda não está vinculada a um apartamento. Peça ao síndico para reenviar o convite.');
  var unitResult=await supabase.from('unidades').select('id,condominio_id,bloco_id,numero,status,aluguel_mensal,contrato_storage_path,contrato_nome,contrato_inicio,contrato_fim,vagas_estacionamento').eq('id',resident.unidade_id).eq('condominio_id',CONDO_ID).maybeSingle();
  if(unitResult.error)throw unitResult.error;
  if(!unitResult.data)throw new Error('O apartamento vinculado a esta conta não foi encontrado.');
  var unit=unitResult.data;
  var results=await Promise.all([
    supabase.from('blocos').select('nome').eq('id',unit.bloco_id).maybeSingle(),
    supabase.from('condominios').select('nome').eq('id',CONDO_ID).maybeSingle(),
    supabase.from('cobrancas_unidade').select('*').eq('condominio_id',CONDO_ID).eq('unidade_id',unit.id).order('competencia',{ascending:false}),
    supabase.from('cobrancas_taxas_adicionais').select('*').eq('condominio_id',CONDO_ID).eq('unidade_id',unit.id).order('competencia',{ascending:false}),
    supabase.from('meios_pagamento_condominio').select('*').eq('condominio_id',CONDO_ID).eq('ativo',true).order('ordem'),
    supabase.from('pagamentos_morador').select('*').eq('user_id',USER.id).eq('condominio_id',CONDO_ID).order('informado_em',{ascending:false}),
    supabase.from('chamados').select('*').eq('condominio_id',CONDO_ID).eq('aberto_por',USER.id).order('criado_em',{ascending:false}),
    supabase.from('encomendas').select('*').eq('condominio_id',CONDO_ID).eq('unidade_id',unit.id).order('chegada_em',{ascending:false}),
    supabase.from('comunicados').select('*').eq('condominio_id',CONDO_ID).order('criado_em',{ascending:false}),
  ]);
  var failed=results.find(function(result){return result.error});if(failed)throw failed.error;
  var block=results[0].data,condo=results[1].data;
  if(!condo)throw new Error('O condomínio desta conta não foi encontrado.');
  var label=(block&&block.nome||'')+'-'+unit.numero;
  CURRENT_MORADOR=resident;COND=condo.nome;S=seed();S.residentCharges=results[2].data||[];S.residentExtraCharges=results[3].data||[];
  S.meios=(results[4].data||[]).map(function(m){return {id:m.id,nome:m.nome,tipo:m.tipo,ativo:m.ativo,dados:m.dados_publicos||{},instrucoes:m.instrucoes||''}});
  S.pagamentos=(results[5].data||[]).map(function(p){return {id:p.id,unidadeId:p.unidade_id,unidade:label,mes:p.competencia.slice(0,7),valor:Number(p.valor),meio:p.meio_nome_snapshot,meioId:p.meio_pagamento_id,data:p.informado_em,status:p.status==='confirmado'?'Confirmado':p.status==='recusado'?'Recusado':'Aguardando conferência'}});
  S.chamados=(results[6].data||[]).map(function(c){return {id:c.id,unidade:label,titulo:c.titulo,status:c.status==='concluido'?'Resolvido':c.status==='em_andamento'?'Em andamento':'Aberto',data:(c.criado_em||c.created_at||'').slice(0,10)}});
  S.encomendas=(results[7].data||[]).map(function(x){return {id:x.id,unidade:label,transp:x.transportadora||'',chegada:x.chegada_em,retirada:x.retirada_em||''}});
  S.comunicados=(results[8].data||[]).map(function(x){return {id:x.id,titulo:x.titulo,texto:x.conteudo,data:(x.criado_em||'').slice(0,10)}});
  var ownName=resident.nome||USER.email||'Morador';
  var residentUnit={id:unit.id,bloco:block&&block.nome||'',apto:unit.numero,dono:'—',morador:ownName,tel:resident.telefone||'—',situacao:'Inquilino',taxa:0,aluguel:Number(unit.aluguel_mensal||(resident.contrato||{}).aluguel_mensal||0),leituras:{},pago:{},residentId:resident.id,contractPath:unit.contrato_storage_path,contractName:unit.contrato_nome,contractStart:unit.contrato_inicio,contractEnd:unit.contrato_fim,parkingSpaces:Array.isArray(unit.vagas_estacionamento)?unit.vagas_estacionamento:[]};
  S.unidades=[residentUnit];MY=label;
  var currentBill=cobrancaMorador(MES);if(currentBill.paid)residentUnit.pago[MES]=true;
  role='morador';view='minha';DB_READY=true;setMes(MES);render();
}
async function loadWorkspace(session){
  USER=session.user;
  var profileRes=await supabase.from('profiles').select('nome,email,condominio_id').eq('id',USER.id).maybeSingle();
  if(profileRes.error)throw profileRes.error;
  var rolesRes=await supabase.from('user_roles').select('role').eq('user_id',USER.id);
  if(rolesRes.error)throw rolesRes.error;
  var userRoles=rolesRes.data||[];
  if(userRoles.some(function(x){return x.role==='porteiro'})&&!userRoles.some(function(x){return x.role==='sindico'||x.role==='super_admin'})){
    if(!profileRes.data||!profileRes.data.condominio_id)throw new Error('Esta conta de portaria ainda não está vinculada a um condomínio.');
    await loadPortariaWorkspace(session,profileRes.data);return;
  }
  if(userRoles.some(function(x){return x.role==='morador'})&&!userRoles.some(function(x){return x.role==='sindico'||x.role==='super_admin'})){
    if(!profileRes.data||!profileRes.data.condominio_id)throw new Error('Esta conta de morador ainda não está vinculada ao condomínio. Peça um novo convite ao síndico.');
    await loadResidentWorkspace(session,profileRes.data);return;
  }
  if(!userRoles.some(function(x){return x.role==='sindico'||x.role==='super_admin'}))throw new Error('Esta conta ainda não está vinculada ao perfil do condomínio.');
  CONDO_ID=profileRes.data&&profileRes.data.condominio_id;
  if(!CONDO_ID)throw new Error('Esta conta não possui condomínio vinculado. Entre novamente pelo cadastro de síndico.');
  var result=await Promise.all(['condominios','blocos','unidades','moradores','configuracoes_financeiras','financeiro_competencias','leituras_consumo','cobrancas_unidade','cobrancas_taxas_adicionais','taxas_adicionais','taxas_adicionais_unidades','meios_pagamento_condominio','pagamentos_morador','despesas_condominio','veiculos_condominio','acessos_prestadores','visitantes','encomendas','comunicados','chamados'].map(dbRows));
  var keys=['condominios','blocos','unidades','moradores','config','competencias','leituras','cobrancas','taxasCobradas','taxas','taxasUnidades','meios','pagamentos','despesas','veiculos','prestadores','visitantes','encomendas','comunicados','chamados'];
  var D={};keys.forEach(function(k,i){D[k]=result[i]});
  var condo=D.condominios.find(function(x){return x.id===CONDO_ID});
  if(!condo)throw new Error('O condomínio vinculado não foi encontrado ou seu acesso foi bloqueado.');
  COND=condo.nome;
  BLOCK_IDS={};D.blocos.forEach(function(b){BLOCK_IDS[b.nome]=b.id});
  var settings=D.config.find(function(c){return c.condominio_id===CONDO_ID})||{};
  var comp=D.competencias.find(function(c){return c.competencia===MES+'-01'})||{};
  S=seed();
  S.config={tarifaGas:Number(comp.tarifa_gas_m3??settings.valor_m3_gas??0),tarifaAgua:Number(settings.valor_m3_agua||0),taxaCondominio:Number(settings.taxa_condominio||0),vencimentoDia:Number(settings.vencimento_dia||10),contaAgua:Number(comp.conta_agua||0),modoAgua:settings.agua_modo==='individual'?'individual':(comp.modo_rateio_agua||settings.criterio_rateio_agua||'consumo'),cobrarAluguel:!!comp.incluir_aluguel_na_cobranca,contaMes:{},tarifaMes:{}};
  D.competencias.forEach(function(x){var m=x.competencia.slice(0,7);S.config.contaMes[m]=Number(x.conta_agua);S.config.tarifaMes[m]=Number(x.tarifa_gas_m3)});
  var morByUnit={};D.moradores.forEach(function(m){morByUnit[m.unidade_id]=morByUnit[m.unidade_id]||[];morByUnit[m.unidade_id].push(m)});
  var readByUnit={};D.leituras.forEach(function(l){readByUnit[l.unidade_id]=readByUnit[l.unidade_id]||{};readByUnit[l.unidade_id][l.competencia.slice(0,7)]=readByUnit[l.unidade_id][l.competencia.slice(0,7)]||{};readByUnit[l.unidade_id][l.competencia.slice(0,7)][l.tipo]=[Number(l.leitura_anterior),Number(l.leitura_atual)]});
  S.unidades=D.unidades.map(function(u){var ms=morByUnit[u.id]||[],owner=ms.find(function(m){return m.tipo==='proprietario'}),tenants=ms.filter(function(m){return m.tipo==='inquilino'}),dependents=ms.filter(function(m){return m.tipo==='dependente'}),residents=tenants.length?tenants:dependents,primary=residents[0],block=D.blocos.find(function(b){return b.id===u.bloco_id});var lease=primary&&primary.contrato||{};return {id:u.id,bloco:block?block.nome:'',apto:u.numero,dono:owner?owner.nome:'',morador:residents.length?residents.map(function(m){return m.nome}).join(', '):owner?owner.nome:'—',tel:primary&&primary.telefone||owner&&owner.telefone||'—',situacao:u.status==='vago'?'Vago':tenants.length?'Inquilino':'Proprietário residente',taxa:S.config.taxaCondominio,aluguel:Number(u.aluguel_mensal||lease.aluguel_mensal||0),leituras:readByUnit[u.id]||{},pago:{},ownerId:owner&&owner.id,residentIds:residents.map(function(m){return m.id}),residentPhones:residents.map(function(m){return m.telefone||''}),residentEmails:residents.map(function(m){return m.email||''}),residentUsers:residents.map(function(m){return m.user_id||''}),contractPath:u.contrato_storage_path,contractName:u.contrato_nome,contractStart:u.contrato_inicio,contractEnd:u.contrato_fim,gasMeter:u.gas_medidor,waterMeter:u.agua_medidor,parkingSpaces:Array.isArray(u.vagas_estacionamento)?u.vagas_estacionamento:[]}});
  var paidRows={};D.cobrancas.forEach(function(c){var key=c.unidade_id+':'+c.competencia.slice(0,7);paidRows[key]=paidRows[key]||{total:0,paid:0};paidRows[key].total++;if(c.status==='pago')paidRows[key].paid++});
  D.taxasCobradas.forEach(function(c){var key=c.unidade_id+':'+c.competencia.slice(0,7);paidRows[key]=paidRows[key]||{total:0,paid:0};paidRows[key].total++;if(c.status==='pago')paidRows[key].paid++});
  Object.keys(paidRows).forEach(function(key){var parts=key.split(':'),u=S.unidades.find(function(x){return x.id===parts[0]});if(u&&paidRows[key].total&&paidRows[key].total===paidRows[key].paid)u.pago[parts[1]]=true});
  S.taxas=D.taxas.map(function(t){return {id:t.id,nome:t.nome,valor:Number(t.valor),modo:t.modo,aplica:t.aplica_a,unidades:D.taxasUnidades.filter(function(x){return x.taxa_id===t.id}).map(function(x){return x.unidade_id}),inicio:t.inicio.slice(0,7),fim:t.fim?t.fim.slice(0,7):''}});
  S.histMes={};
  var addHist=function(m,i,v){S.histMes[m]=S.histMes[m]||[0,0];S.histMes[m][i]+=v};
  D.cobrancas.concat(D.taxasCobradas).forEach(function(c){if(c.status==='pago')addHist(c.competencia.slice(0,7),0,Number(c.valor||0))});
  D.despesas.forEach(function(x){addHist(String(x.data).slice(0,7),1,Number(x.valor||0))});
  S.meios=D.meios.map(function(x){return {id:x.id,nome:x.nome,tipo:x.tipo,ativo:x.ativo,dados:x.dados_publicos||{},instrucoes:x.instrucoes||''}});
  S.pagamentos=D.pagamentos.map(function(x){return {id:x.id,unidadeId:x.unidade_id,unidade:(S.unidades.find(function(u){return u.id===x.unidade_id})||{}).bloco+'-'+(S.unidades.find(function(u){return u.id===x.unidade_id})||{}).apto,mes:x.competencia.slice(0,7),valor:Number(x.valor),meio:x.meio_nome_snapshot,meioId:x.meio_pagamento_id,data:x.informado_em,status:x.status==='confirmado'?'Confirmado':x.status==='recusado'?'Recusado':'Aguardando conferência'} });
  S.despesas=D.despesas.map(function(x){return {id:x.id,desc:x.descricao,cat:x.categoria,valor:Number(x.valor),data:x.data,fornecedor:x.fornecedor||''}});
  S.veiculos=D.veiculos.map(function(x){var u=S.unidades.find(function(y){return y.id===x.unidade_id});return {id:x.id,placa:x.placa,modelo:x.modelo,cor:x.cor||'',tipo:x.tipo==='morador'?'Morador':x.tipo==='visitante'?'Visitante':'Prestador',unidade:u?uLabel(u):'',vaga:x.vaga||'',entrada:x.entrada_em||'',saida:x.saida_em||''}});
  S.prestadores=D.prestadores.map(function(x){var u=S.unidades.find(function(y){return y.id===x.unidade_id});return {id:x.id,nome:x.nome,empresa:x.empresa||'',servico:x.servico,doc:x.documento||'',unidade:u?uLabel(u):'',autorizado:x.autorizado_por||'',entrada:x.entrada_em,saida:x.saida_em||''}});
  S.visitantes=D.visitantes.map(function(x){var u=S.unidades.find(function(y){return y.id===x.unidade_id});return {id:x.id,nome:x.nome,doc:x.documento||'',unidade:u?uLabel(u):'',entrada:x.entrada_em,saida:x.saida_em||''}});
  S.encomendas=D.encomendas.map(function(x){var u=S.unidades.find(function(y){return y.id===x.unidade_id});return {id:x.id,unidade:u?uLabel(u):'',transp:x.transportadora||'',chegada:x.chegada_em,retirada:x.retirada_em||'',avisado:x.avisado_em||''}});
  S.comunicados=D.comunicados.map(function(x){return {id:x.id,titulo:x.titulo,texto:x.conteudo,data:x.criado_em.slice(0,10)}});
  S.chamados=D.chamados.map(function(x){var u=S.unidades.find(function(y){return y.id===x.unidade_id});return {id:x.id,unidade:u?uLabel(u):'',titulo:x.titulo,status:x.status==='resolvido'?'Resolvido':x.status==='em_andamento'?'Em andamento':'Aberto',data:x.criado_em.slice(0,10)}});
  var generated=await supabase.rpc('gerar_cobrancas_condominio',{_competencia:MES+'-01'});if(generated.error)throw generated.error;
  DB_READY=true;role='sindico';setMes(MES);view='dashboard';await refreshPortariaConfig();render();
}
async function persistPortariaWorkspace(){
  if(!supabase||!USER||!CONDO_ID)return;
  var result=await supabase.functions.invoke('portaria-workspace',{body:{action:'save',visitantes:S.visitantes,prestadores:S.prestadores,veiculos:S.veiculos,encomendas:S.encomendas}});
  if(result.error)throw result.error;
  if(result.data&&result.data.error)throw new Error(result.data.error);
}
async function persistWorkspace(){
  if(!supabase||!USER||!CONDO_ID)return;
  function ok(result){if(result.error)throw result.error;return result.data}
  var blockNames=Array.from(new Set(S.unidades.map(function(u){return u.bloco}).filter(Boolean)));
  for(var bn of blockNames){if(!BLOCK_IDS[bn])BLOCK_IDS[bn]=uid()}
  if(blockNames.length)ok(await supabase.from('blocos').upsert(blockNames.map(function(nome){return {id:BLOCK_IDS[nome],condominio_id:CONDO_ID,nome:nome}}),{onConflict:'id'}));
  var base={condominio_id:CONDO_ID,taxa_condominio:Number(S.config.taxaCondominio||0),vencimento_dia:Math.max(1,Math.min(28,Number(S.config.vencimentoDia||10))),valor_m3_gas:Number(tarifaDe(MES)||0),agua_modo:S.config.modoAgua==='individual'?'individual':'rateio',valor_m3_agua:Number(S.config.tarifaAgua||0),criterio_rateio_agua:S.config.modoAgua==='igual'?'igual':'fracao_ideal',updated_at:new Date().toISOString()};
  ok(await supabase.from('configuracoes_financeiras').upsert(base,{onConflict:'condominio_id'}));
  var unitRows=S.unidades.map(function(u){return {id:u.id,condominio_id:CONDO_ID,bloco_id:BLOCK_IDS[u.bloco],numero:u.apto,status:u.situacao==='Vago'?'vago':'ocupado',aluguel_mensal:Number(u.aluguel||0),gas_medidor:u.gasMeter||null,agua_medidor:u.waterMeter||null,contrato_storage_path:u.contractPath||null,contrato_nome:u.contractName||null,contrato_inicio:u.contractStart||null,contrato_fim:u.contractEnd||null,vagas_estacionamento:u.parkingSpaces||[]}});
  if(unitRows.length)ok(await supabase.from('unidades').upsert(unitRows,{onConflict:'id'}));
  var residentRows=[];
  S.unidades.forEach(function(u){if(u.dono){u.ownerId=u.ownerId||uid();residentRows.push({id:u.ownerId,condominio_id:CONDO_ID,unidade_id:u.id,nome:u.dono,tipo:'proprietario',telefone:u.tel==='—'?null:u.tel})}var names=splitNames(u.morador).filter(function(n){return n&&n!=='—'&&n!==u.dono});names.forEach(function(name,i){var residentId=(u.residentIds||[])[i]||uid();u.residentIds=u.residentIds||[];u.residentIds[i]=residentId;residentRows.push({id:residentId,condominio_id:CONDO_ID,unidade_id:u.id,nome:name,tipo:u.situacao==='Inquilino'?'inquilino':'dependente',telefone:(u.residentPhones||[]).length?((u.residentPhones||[])[i]||null):(u.tel==='—'?null:u.tel),email:(u.residentEmails||[])[i]||null,contrato:u.situacao==='Inquilino'?{aluguel_mensal:Number(u.aluguel||0),inicio:u.contractStart||null,fim:u.contractEnd||null}:null})})});
  if(residentRows.length)ok(await supabase.from('moradores').upsert(residentRows,{onConflict:'id'}));
  var competencia=MES+'-01';
  var fee={condominio_id:CONDO_ID,competencia:competencia,conta_agua:Number(contaAguaDe(MES)||0),tarifa_gas_m3:Number(tarifaDe(MES)||0),modo_rateio_agua:S.config.modoAgua==='igual'?'igual':'consumo',incluir_aluguel_na_cobranca:!!S.config.cobrarAluguel,updated_by:USER.id,updated_at:new Date().toISOString()};
  ok(await supabase.from('financeiro_competencias').upsert(fee,{onConflict:'condominio_id,competencia'}));
  var readings=[];
  S.unidades.forEach(function(u){
    Object.keys(u.leituras||{}).forEach(function(m){
      ['agua','gas'].forEach(function(k){
        var val=u.leituras[m]&&u.leituras[m][k];
        if(!val)return;
        var ant=Number(val[0]||0),atual=Number(val[1]||0),cons=Math.max(0,atual-ant);
        readings.push({condominio_id:CONDO_ID,unidade_id:u.id,tipo:k,competencia:m+'-01',leitura_anterior:ant,leitura_atual:Math.max(ant,atual),valor_unitario:k==='gas'?Number(tarifaDe(m)||0):Number(S.config.tarifaAgua||0),criado_por:USER.id});
      });
    });
  });
  if(readings.length)ok(await supabase.from('leituras_consumo').upsert(readings,{onConflict:'unidade_id,tipo,competencia'}));
  var feeRows=S.taxas.map(function(t){return {id:t.id,condominio_id:CONDO_ID,nome:t.nome,valor:Number(t.valor),modo:t.modo,aplica_a:t.aplica,inicio:t.inicio+'-01',fim:t.fim?t.fim+'-01':null,ativa:true,criado_por:USER.id}});
  if(feeRows.length)ok(await supabase.from('taxas_adicionais').upsert(feeRows,{onConflict:'id'}));
  var currentUnitIds=new Set(S.unidades.map(function(u){return u.id}));
  var selected=[];S.taxas.forEach(function(t){(t.unidades||[]).forEach(function(id){if(currentUnitIds.has(id))selected.push({condominio_id:CONDO_ID,taxa_id:t.id,unidade_id:id})})});
  if(selected.length)ok(await supabase.from('taxas_adicionais_unidades').upsert(selected,{onConflict:'taxa_id,unidade_id'}));
  var expenses=S.despesas.map(function(x){return {id:x.id,condominio_id:CONDO_ID,descricao:x.desc,categoria:x.cat,valor:Number(x.valor),data:x.data,fornecedor:x.fornecedor||null,criado_por:USER.id}});
  if(expenses.length)ok(await supabase.from('despesas_condominio').upsert(expenses,{onConflict:'id'}));
  var paymentMethods=S.meios.map(function(x,i){return {id:x.id,condominio_id:CONDO_ID,nome:x.nome,tipo:x.tipo,dados_publicos:x.dados||{},instrucoes:x.instrucoes||null,ativo:!!x.ativo,ordem:i,criado_por:USER.id,updated_at:new Date().toISOString()}});
  if(paymentMethods.length)ok(await supabase.from('meios_pagamento_condominio').upsert(paymentMethods,{onConflict:'id'}));
  var providerRows=S.prestadores.map(function(x){var u=unitByLabel(x.unidade);return {id:x.id,condominio_id:CONDO_ID,unidade_id:u&&u.id,nome:x.nome,documento:x.doc||null,empresa:x.empresa||null,servico:x.servico,autorizado_por:x.autorizado||null,entrada_em:new Date(x.entrada).toISOString(),saida_em:x.saida?new Date(x.saida).toISOString():null,registrado_por:USER.id}}).filter(function(x){return x.unidade_id});
  if(providerRows.length)ok(await supabase.from('acessos_prestadores').upsert(providerRows,{onConflict:'id'}));
  var vehicleRows=S.veiculos.map(function(x){var u=unitByLabel(x.unidade);return {id:x.id,condominio_id:CONDO_ID,unidade_id:u&&u.id,placa:x.placa,modelo:x.modelo,cor:x.cor||null,tipo:x.tipo==='Morador'?'morador':x.tipo==='Visitante'?'visitante':'prestador',vaga:x.vaga||null,entrada_em:x.entrada?new Date(x.entrada).toISOString():null,saida_em:x.saida?new Date(x.saida).toISOString():null,criado_por:USER.id}}).filter(function(x){return x.unidade_id});
  if(vehicleRows.length)ok(await supabase.from('veiculos_condominio').upsert(vehicleRows,{onConflict:'id'}));
  var visitorRows=S.visitantes.map(function(x){var u=unitByLabel(x.unidade);return {id:x.id,condominio_id:CONDO_ID,unidade_id:u&&u.id,nome:x.nome,documento:x.doc||null,tipo:'visitante',autorizado_por:null,entrada_em:new Date(x.entrada).toISOString(),saida_em:x.saida?new Date(x.saida).toISOString():null,registrado_por:USER.id}}).filter(function(x){return x.unidade_id});
  if(visitorRows.length)ok(await supabase.from('visitantes').upsert(visitorRows,{onConflict:'id'}));
  var packageRows=S.encomendas.map(function(x){var u=unitByLabel(x.unidade);return {id:x.id,condominio_id:CONDO_ID,unidade_id:u&&u.id,descricao:'Encomenda para '+x.unidade,transportadora:x.transp||null,chegada_em:new Date(x.chegada).toISOString(),status:x.retirada?'retirada':'pendente',retirada_em:x.retirada?new Date(x.retirada).toISOString():null,avisado_em:x.avisado?new Date(x.avisado).toISOString():null,registrado_por:USER.id}}).filter(function(x){return x.unidade_id});
  if(packageRows.length)ok(await supabase.from('encomendas').upsert(packageRows,{onConflict:'id'}));
  var noticeRows=S.comunicados.map(function(x){return {id:x.id,condominio_id:CONDO_ID,titulo:x.titulo,conteudo:x.texto,tipo:'comunicado',autor_id:USER.id,criado_em:new Date(x.data+'T12:00:00').toISOString()}});
  if(noticeRows.length)ok(await supabase.from('comunicados').upsert(noticeRows,{onConflict:'id'}));
  var ticketRows=S.chamados.map(function(x){var u=unitByLabel(x.unidade);return {id:x.id,condominio_id:CONDO_ID,titulo:x.titulo,descricao:x.titulo,categoria:'outros',prioridade:'media',status:x.status==='Resolvido'?'concluido':x.status==='Em andamento'?'em_andamento':'aberto',local:null,unidade_id:u&&u.id,aberto_por:USER.id}});
  if(ticketRows.length)ok(await supabase.from('chamados').upsert(ticketRows,{onConflict:'id'}));
  var rpc=await supabase.rpc('gerar_cobrancas_condominio',{_competencia:competencia});if(rpc.error)throw rpc.error;
}

function vDash(){
  var arrec=totalArrecadado(), esp=totalEsperado(), desp=totalDespesas(), emAberto=esp-arrec;
  var inad=S.unidades.filter(function(u){return !paid(u)});
  var ms=[],mm=MES;for(var i=0;i<6;i++){ms.unshift(mm);mm=prevMes(mm)}
  var hist=ms.map(function(x){if(x===MES)return [mesCurto(x),arrec,desp];var h=(S.histMes||{})[x];return h?[mesCurto(x),h[0],h[1]]:[mesCurto(x),0,0]});
  var max=Math.max(1,Math.max.apply(null,hist.map(function(h){return Math.max(h[1],h[2])})));
  var bars=hist.map(function(h){return '<div class="bar"><div class="pair"><i style="height:'+(h[1]/max*100).toFixed(1)+'%" title="Arrecadado '+brl(h[1])+'"></i><i class="d" style="height:'+(h[2]/max*100).toFixed(1)+'%" title="Despesas '+brl(h[2])+'"></i></div><span>'+h[0]+'</span></div>'}).join('');
  var dentro=S.visitantes.filter(function(v){return !v.saida});
  var enc=S.encomendas.filter(function(e){return !e.retirada});
  var ab=S.chamados.filter(function(c){return c.status!=='Resolvido'});
  var aguard=S.pagamentos.filter(function(x){return x.status==='Aguardando conferência'}).length;
  var todoHtml='<div class="todo-grid" aria-label="O que precisa de atenção">'+todoCard('Pagamentos para conferir',aguard,'financeiro','meios')+todoCard(isLate(MES)?'Cobranças em atraso':'Cobranças em aberto',inad.length,'financeiro','cobrancas')+todoCard('Chamados em aberto',ab.length,'comunicacao','')+(PORTARIA_CONFIG.habilitada?todoCard('Encomendas aguardando',enc.length,'portaria',''):'')+'</div>';
  return head('Painel do síndico',MES_LABEL+' · '+S.unidades.length+' unidades')+todoHtml+
  '<div class="kpis">'+
   '<div class="kpi"><span>Arrecadado</span><b>'+brl(arrec)+'</b><small>de '+brl(esp)+'</small></div>'+
   '<div class="kpi"><span>Em aberto</span><b style="color:var(--bad)">'+brl(emAberto)+'</b><small>'+inad.length+' unidades</small></div>'+
   '<div class="kpi"><span>Despesas</span><b>'+brl(desp)+'</b><small>'+despMes().length+' lançamentos</small></div>'+
   '<div class="kpi"><span>Saldo do mês</span><b style="color:'+(arrec-desp>=0?'var(--ok)':'var(--bad)')+'">'+brl(arrec-desp)+'</b><small>arrecadado menos despesas</small></div></div>'+
  '<div class="grid"><div class="panel"><h3>Receita e despesa, últimos 6 meses</h3><div class="bars">'+bars+'</div><div class="legend"><span><b style="background:var(--accent)"></b>Arrecadado</span><span><b style="background:var(--warn)"></b>Despesas</span></div></div>'+
  '<div class="panel"><h3>'+(isLate(MES)?'Taxas em atraso':'Cobranças em aberto')+'</h3>'+(inad.length?'<div class="list">'+inad.map(function(u){return '<div class="item"><div><b>'+esc(uLabel(u))+'</b> · '+esc(u.dono)+'<p>vencimento '+fmtD(dueDate(MES))+' · '+esc(u.tel)+'</p></div><span class="num">'+brl(cobranca(u).total)+'</span></div>'}).join('')+'</div>':'<p class="empty">Nenhuma unidade com cobrança em aberto.</p>')+'</div></div>'+
  '<div class="grid"><div class="panel"><h3>Na portaria agora</h3>'+
    '<p style="margin:0 0 6px"><span class="pill warn">'+dentro.length+' visitantes dentro</span> <span class="pill mute">'+enc.length+' encomendas aguardando</span></p>'+
    '<div class="list">'+(dentro.map(function(v){return '<div class="item"><div><b>'+esc(v.nome)+'</b><p>para '+esc(v.unidade)+' · entrou '+fmtDT(v.entrada)+'</p></div></div>'}).join('')||'<p class="empty">Ninguém no condomínio.</p>')+'</div></div>'+
  '<div class="panel"><h3>Chamados em aberto</h3><div class="list">'+(ab.map(function(c){return '<div class="item"><div><b>'+esc(c.titulo)+'</b><p>'+esc(c.unidade)+' · '+fmtD(c.data)+'</p></div><span class="pill '+(c.status==='Aberto'?'bad':'warn')+'">'+c.status+'</span></div>'}).join('')||'<p class="empty">Nenhum chamado em aberto.</p>')+'</div></div></div>';
}

function vUnits(){
  var blocks=Array.from(new Set(S.unidades.map(function(u){return u.bloco}))).sort();
var tenantEditor=function(u){
  if(activeUnitId!==u.id)return '';
  var extras=extrasDe(u,MES),c=cobranca(u),isEditing=editingTenant,editingLease=isEditing&&u.situacao==='Inquilino',isVacant=u.situacao==='Vago';
  var form=(isVacant||isEditing)
    ?'<h4>'+(isEditing?(editingLease?'Editar moradores e aluguel':'Cadastrar moradores e aluguel'):'Nova locação')+'</h4><p class="note">'+(isEditing?'Atualize os moradores, os telefones, o valor do aluguel e os dados do contrato.':'A unidade, o bloco, os medidores e as vagas já estão cadastrados. Preencha os dados da nova locação.')+'</p><form class="f" id="f-tenant" data-unit-id="'+esc(u.id)+'"><div class="resident-contact-grid"><label>Nomes dos moradores/inquilinos<textarea id="n-nomes" rows="4" required placeholder="Digite um nome por linha">'+(editingLease?splitNames(u.morador).map(function(name){return esc(name)}).join('&#10;'):'')+'</textarea><small>Digite cada pessoa em uma linha. O acesso ao aplicativo é cadastrado separadamente, depois de salvar a locação.</small></label><label>Telefones dos moradores<textarea id="n-telefones" rows="4" placeholder="Um telefone por linha, na mesma ordem dos nomes">'+(editingLease?(u.residentPhones||[]).map(function(phone){return esc(phone)}).join('&#10;'):'')+'</textarea><small>Informe um telefone para cada pessoa na mesma ordem dos nomes. Se alguém não tiver telefone, deixe a linha correspondente vazia.</small></label></div><label>Aluguel mensal (R$)<input id="n-aluguel" type="number" min="0" step="0.01" value="'+(editingLease?Number(u.aluguel||0):0)+'" required></label><label>Início do contrato<input id="n-inicio" type="date" value="'+(editingLease?esc(u.contractStart||''):'')+'"></label><label>Fim do contrato<input id="n-fim" type="date" value="'+(editingLease?esc(u.contractEnd||''):'')+'"></label><label class="wide">Contrato de aluguel (opcional)<input id="n-contrato" type="file" accept="application/pdf,image/jpeg,image/png"></label><button class="btn" type="submit">'+(isEditing?'Salvar moradores e aluguel':'Salvar locação')+'</button>'+(isEditing?'<button class="btn ghost" type="button" data-cancel-edit>Cancelar edição</button>':'')+'</form>'
    :'';
  var access='';
  if(u.situacao==='Inquilino'&&!isEditing){
    var names=splitNames(u.morador),ids=u.residentIds||[],emails=u.residentEmails||[],users=u.residentUsers||[];
    var accessRows=ids.map(function(id,index){
      var name=names[index]||('Morador '+(index+1)),email=emails[index]||'',active=!!users[index],pending=!!RESIDENT_INVITES[id];
      if(active)delete RESIDENT_INVITES[id];
      return '<article class="resident-access-row"><div class="resident-access-person"><b>'+esc(name)+'</b><span class="pill '+(active?'ok':pending?'warn':'mute')+'">'+(active?'Acesso ativo':pending?'Convite enviado':'Sem acesso')+'</span></div>'+(active?'<p class="note">Este morador já consegue entrar no aplicativo com '+esc(email||'o e-mail cadastrado')+'.</p>':(pending?'<p class="note">O convite foi enviado para '+esc(email)+'. O morador precisa abrir o link e criar a senha para ativar o acesso.</p>':'')+'<form class="f resident-access-form" data-resident-access-form data-unit-id="'+esc(u.id)+'" data-resident-id="'+esc(id)+'"><label class="wide">E-mail de acesso<input type="email" name="email" value="'+esc(email)+'" required placeholder="morador@email.com" autocomplete="email"></label><button class="btn sm" type="submit">'+(pending?'Reenviar convite':'Cadastrar acesso e enviar convite')+'</button></form>')+'</article>';
    }).join('');
    access='<section class="resident-access panel"><div><h4>Acesso ao aplicativo</h4><p class="note">Cadastre o acesso de cada morador separadamente. O convite será enviado para o e-mail informado.</p></div>'+(accessRows||'<p class="empty">Não há moradores cadastrados nesta locação.</p>')+'</section>';
  }
  var current=u.situacao==='Inquilino'
    ?'<div class="unit-detail-actions"><div><h4>Ocupação atual</h4><p>Inquilino(s): <b>'+esc(u.morador||'—')+'</b> · aluguel: <b>'+brl(u.aluguel||0)+'</b></p><p>Telefones: '+(splitNames(u.morador).map(function(name,i){return '<b>'+esc(name)+'</b> '+esc((u.residentPhones||[])[i]||'—')}).join(' · ')||'—')+'</p><p class="note">Ao registrar a desocupação, o apartamento continuará cadastrado.</p></div><div><button class="btn sm ghost" type="button" data-edit-tenant>Editar moradores e aluguel</button> <button class="btn sm danger" type="button" data-vacate="'+esc(u.id)+'">Registrar desocupação</button></div></div>'
    :u.situacao==='Proprietário residente'?'<div class="unit-detail-actions"><div><h4>Ocupação do proprietário</h4><p class="note">Os dados desta unidade podem ser atualizados ou convertidos em uma locação.</p></div><button class="btn sm ghost" type="button" data-edit-tenant>Cadastrar moradores e aluguel</button></div>':'';
  return '<div class="unit-modal-backdrop" data-unit-modal-backdrop><section class="panel unit-detail" role="dialog" aria-modal="true" aria-labelledby="unit-modal-title"><div class="unit-detail-head"><div><h3 id="unit-modal-title">Apartamento '+esc(u.apto)+'</h3><p class="note">Bloco '+esc(u.bloco)+' · '+esc(u.situacao)+'</p></div><button class="btn sm ghost" type="button" data-close-unit data-unit-modal-close aria-label="Fechar detalhes do apartamento">Fechar</button></div><div class="unit-detail-grid"><div><small>Proprietário</small><b>'+esc(u.dono||'—')+'</b></div><div><small>Moradores/inquilinos</small><b>'+esc(u.morador||'—')+'</b></div><div><small>Contato</small><b>'+esc(u.tel||'—')+'</b></div><div><small>Condomínio mensal</small><b>'+brl(c.taxa)+'</b></div><div><small>Aluguel</small><b>'+(u.aluguel?brl(u.aluguel):'—')+'</b></div><div><small>Medidor de água</small><b>'+esc(u.waterMeter||'—')+'</b></div><div><small>Medidor de gás</small><b>'+esc(u.gasMeter||'—')+'</b></div><div><small>Vagas de estacionamento</small><b>'+(u.parkingSpaces&&u.parkingSpaces.length?u.parkingSpaces.map(esc).join(', '):'—')+'</b></div></div><p>Taxas adicionais: '+(extras.length?extras.map(function(x){return esc(x.nome)+' '+brl(x.valor)}).join(' · '):'—')+'</p><div class="unit-tile-actions">'+(u.contractPath?'<button class="btn sm ghost" data-contract="'+esc(u.contractPath)+'">'+(isVacant?'Abrir último contrato':'Abrir contrato')+'</button>':'<span class="pill mute">Sem contrato</span>')+'<button class="btn sm danger" data-del-unit="'+esc(u.id)+'">Remover apartamento</button></div>'+current+form+access+'</section></div>';
};
  var unitTile=function(u,showBlock){return '<article class="unit-tile" role="button" tabindex="0" aria-expanded="'+(activeUnitId===u.id)+'" data-open-unit="'+esc(u.id)+'"><div class="unit-tile-head"><b>'+(showBlock?'Bloco '+esc(u.bloco)+' · ':'')+'Apto '+esc(u.apto)+'</b><span class="pill '+(u.situacao==='Vago'?'mute':u.situacao==='Inquilino'?'warn':'ok')+'">'+(u.situacao==='Proprietário residente'?'Proprietário':esc(u.situacao))+'</span></div><p>'+esc(u.morador&&u.morador!=='—'?u.morador:'Sem morador cadastrado')+'</p></article>'};
  var blockPanels=blocks.map(function(bl){var us=S.unidades.filter(function(u){return u.bloco===bl}).sort(function(a,b){return a.apto.localeCompare(b.apto,undefined,{numeric:true})}),cards=us.map(function(u){return unitTile(u)}).join(''),selected=S.unidades.find(function(u){return u.id===activeUnitId&&u.bloco===bl});return '<section class="block-column"><h3>Bloco '+esc(bl)+'<span class="pill mute">'+us.length+(us.length===1?' apto':' aptos')+'</span></h3><div class="unit-grid">'+cards+'</div>'+(selected?tenantEditor(selected):'')+'</section>'});
  var tabBar='<div class="subtabs" role="tablist" aria-label="Unidades e moradores"><button type="button" role="tab" data-unit-tab="apartamentos" aria-selected="'+(unitTab==='apartamentos')+'">Apartamentos por bloco</button><button type="button" role="tab" data-unit-tab="cadastro" aria-selected="'+(unitTab==='cadastro')+'">Cadastrar unidade</button></div>';
  var settingsAndForm='<div class="panel"><h3>Taxa padrão do condomínio</h3><form class="f" id="f-config"><label>Valor mensal (R$)<input id="cfg-taxa" type="number" min="0" step="0.01" value="'+Number(S.config.taxaCondominio||0)+'" required></label><label>Dia de vencimento<input id="cfg-venc" type="number" min="1" max="28" value="'+Number(S.config.vencimentoDia||10)+'" required></label><button class="btn" type="submit">Salvar cobrança padrão</button></form><p class="note">O valor padrão é aplicado automaticamente às unidades ocupadas; o síndico pode gerar ou recalcular as cobranças do mês no Financeiro.</p></div>'+
  '<div class="panel"><h3>Nova unidade</h3><form class="f" id="f-unit">'+
   '<label>Bloco<input id="u-bloco" required maxlength="3" pattern="[A-Za-z0-9]{1,3}" title="Use letras e números" placeholder="A"></label>'+
   '<label>Apartamento<input id="u-apto" required maxlength="6" pattern="[A-Za-z0-9]{1,6}" title="Use letras e números" placeholder="401"></label>'+
   '<label>Proprietário<input id="u-dono" required></label>'+
   '<div class="resident-contact-grid"><label>Moradores/inquilinos<textarea id="u-morador" rows="3" placeholder="Digite um nome por linha"></textarea><small>Você pode cadastrar várias pessoas no mesmo apartamento, uma por linha.</small></label>'+
   '<label>Telefones dos moradores/inquilinos<textarea id="u-telefones" rows="3" placeholder="Um telefone por linha, na mesma ordem dos nomes"></textarea><small>Informe um telefone para cada pessoa na mesma ordem dos nomes. Se alguém não tiver telefone, deixe a linha correspondente vazia.</small></label></div>'+
   '<label>Telefone do proprietário/contato<input id="u-tel" placeholder="(47) 90000-0000"></label>'+
   '<label>Situação<select id="u-sit"><option>Proprietário residente</option><option>Inquilino</option><option>Vago</option></select></label>'+
   '<label>Aluguel (R$)<input id="u-alu" type="number" min="0" step="0.01" value="0"></label>'+
   '<label>Medidor de gás<input id="u-gas" placeholder="Ex.: G-101"></label><label>Medidor de água<input id="u-agua" placeholder="Ex.: A-101"></label>'+
   '<label class="wide">Vagas de estacionamento vinculadas<input id="u-vagas" placeholder="Ex.: 12, V1, V2"><small>Informe a identificação de cada vaga, separada por vírgula.</small></label>'+
   '<label>Início do contrato<input id="u-inicio" type="date"></label><label>Fim do contrato<input id="u-fim" type="date"></label>'+
   '<label class="wide">Contrato de aluguel (PDF, JPG ou PNG)<input id="u-contrato" type="file" accept="application/pdf,image/jpeg,image/png"></label>'+
   '<p class="note wide">Taxa mensal padrão do condomínio: <b>'+brl(S.config.taxaCondominio||0)+'</b>. Configure esse valor no cadastro do condomínio.</p>'+
   '<button class="btn" type="submit">Cadastrar unidade</button></form></div>';
  if(blocks.indexOf(activeBlock)<0)activeBlock=blocks[0]||'';
  var blockTabs=blocks.map(function(bl){return '<button type="button" role="tab" data-block-tab="'+esc(bl)+'" aria-selected="'+(bl===activeBlock)+'">Bloco '+esc(bl)+'</button>'}).join('');
  var apartmentBoard=blocks.length?'<div class="subtabs" role="tablist" aria-label="Blocos do condomínio">'+blockTabs+'</div><div class="block-board">'+blockPanels[blocks.indexOf(activeBlock)]+'</div>':'<div class="panel"><p class="empty">Nenhuma unidade cadastrada. Use a aba “Cadastrar unidade” para começar.</p></div>';
  var uq=unitQ.toLowerCase().trim();
  var searchBox='<div class="toolbar"><input id="q-unit" type="search" placeholder="Buscar apartamento, morador, proprietário ou telefone" value="'+esc(unitQ)+'" aria-label="Buscar unidade"></div>';
  var found=uq?S.unidades.filter(function(u){return (u.bloco+'-'+u.apto+' '+(u.dono||'')+' '+(u.morador||'')+' '+(u.tel||'')).toLowerCase().indexOf(uq)>-1}).sort(function(a,b){return uLabel(a).localeCompare(uLabel(b),undefined,{numeric:true})}):[];
  var foundSel=found.find(function(u){return u.id===activeUnitId});
  var searchPanel=uq?'<section class="block-column"><h3>Resultados da busca<span class="pill mute">'+found.length+'</span></h3>'+(found.length?'<div class="unit-grid">'+found.map(function(u){return unitTile(u,true)}).join('')+'</div>':'<p class="empty">Nenhum apartamento encontrado.</p>')+(foundSel?tenantEditor(foundSel):'')+'</section>':'';
  return head('Unidades e moradores',unitTab==='apartamentos'?'Apartamentos organizados por bloco. Abra um card para gerenciar a ocupação.':'Cadastre novas unidades e configure a cobrança padrão do condomínio.')+tabBar+(unitTab==='cadastro'?settingsAndForm:searchBox+(uq?searchPanel:apartmentBoard));
}

function vAccesses(){
  var rows=[];
  S.unidades.filter(function(u){return u.situacao==='Inquilino'}).forEach(function(u){
    var names=splitNames(u.morador),ids=u.residentIds||[],emails=u.residentEmails||[],users=u.residentUsers||[];
    ids.forEach(function(id,index){
      var email=emails[index]||'',active=!!users[index],pending=!!RESIDENT_INVITES[id];
      if(active)delete RESIDENT_INVITES[id];
      rows.push('<article class="resident-access-row"><div class="resident-access-person"><div><b>'+esc(names[index]||('Morador '+(index+1)))+'</b><p class="note">Apartamento '+esc(uLabel(u))+'</p></div><span class="pill '+(active?'ok':pending?'warn':'mute')+'">'+(active?'Acesso ativo':pending?'Convite enviado':'Sem acesso')+'</span></div>'+(active?'<p class="note">Este morador entra no aplicativo com '+esc(email||'o e-mail cadastrado')+'.</p>':(pending?'<p class="note">Convite enviado para '+esc(email)+'. O morador deve abrir o link e criar a senha.</p>':'')+'<form class="f resident-access-form" data-resident-access-form data-unit-id="'+esc(u.id)+'" data-resident-id="'+esc(id)+'"><label class="wide">E-mail de acesso<input type="email" name="email" value="'+esc(email)+'" required placeholder="morador@email.com" autocomplete="email"></label><button class="btn sm" type="submit">'+(pending?'Reenviar convite':'Cadastrar acesso e enviar convite')+'</button></form>')+'</article>');
    });
  });
  return head('Acessos dos moradores','Cadastre e acompanhe o acesso de cada morador ao aplicativo.')+
    '<section class="panel resident-access"><div><h3>Liberação de acesso ao aplicativo</h3><p class="note">Informe um e-mail para cada morador. O sistema enviará um convite para criar senha e entrar na área privada do próprio apartamento.</p></div>'+
    (rows.length?rows.join(''):'<div class="empty">Ainda não há moradores em locações cadastradas. Primeiro cadastre os moradores em <b>Unidades e moradores</b> e salve a locação; depois eles aparecerão aqui.</div>')+'</section>';
}

function finList(){var q=finQ.toLowerCase();return S.unidades.filter(function(u){var p=paid(u);if(finSt==='pagos'&&!p)return false;if(finSt==='abertos'&&p)return false;if(finSt==='atrasados'&&(p||!isLate(MES)))return false;if(!q)return true;return (uLabel(u)+' '+(u.dono||'')+' '+(u.morador||'')).toLowerCase().indexOf(q)>-1})}
function finToolbar(){var o=function(v,l){return '<option value="'+v+'"'+(finSt===v?' selected':'')+'>'+l+'</option>'};return '<div class="toolbar"><input id="q-fin" type="search" placeholder="Buscar unidade ou responsável" value="'+esc(finQ)+'" aria-label="Buscar cobrança"><select id="q-fin-st" aria-label="Filtrar por situação">'+o('todos','Todas as situações')+o('abertos','Em aberto')+o('atrasados','Em atraso')+o('pagos','Pagas')+'</select><button class="btn sm ghost" type="button" data-export-cob>Exportar CSV</button><button class="btn sm ghost" type="button" data-print-report>Imprimir relatório</button></div>'}
var csvNum=function(v){return Number(v||0).toFixed(2).replace('.',',')};
function downloadCsv(name,rows){var txt='﻿'+rows.map(function(r){return r.map(function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'}).join(';')}).join('\r\n');var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function exportCobrancas(){var tx=taxasMes(),late=isLate(MES);var rows=[['Unidade','Responsável','Taxa','Água','Gás'].concat(tx.map(function(t){return t.nome})).concat(['Aluguel','Total a pagar','Situação'])];S.unidades.forEach(function(u){var c=cobranca(u),p=paid(u);rows.push([uLabel(u),u.dono||u.morador,csvNum(c.taxa),csvNum(c.agua),csvNum(c.gas)].concat(tx.map(function(t){return csvNum(taxaValor(t,u,MES))})).concat([csvNum(c.aluguel),csvNum(c.total),p?'Pago':late?'Em atraso':'A vencer']))});downloadCsv('cobrancas-'+MES+'.csv',rows)}
function exportDespesas(){var rows=[['Data','Descrição','Categoria','Valor']];despMes().slice().sort(function(a,b){return a.data.localeCompare(b.data)}).forEach(function(x){rows.push([fmtD(x.data),x.desc,x.cat,csvNum(x.valor)])});rows.push(['','','Total',csvNum(totalDespesas())]);downloadCsv('despesas-'+MES+'.csv',rows)}
function printReport(){var w=window.open('','_blank');if(!w){flash('Libere os pop-ups do navegador para imprimir o relatório.');return}
  var arrec=totalArrecadado(),esp=totalEsperado(),desp=totalDespesas(),late=isLate(MES);
  var rows=S.unidades.map(function(u){var c=cobranca(u),p=paid(u);return '<tr><td>'+esc(uLabel(u))+'</td><td>'+esc(u.dono||u.morador)+'</td><td class="r">'+brl(c.total)+'</td><td>'+(p?'Pago':late?'Em atraso':'A vencer')+'</td></tr>'}).join('');
  var dr=despMes().slice().sort(function(a,b){return a.data.localeCompare(b.data)}).map(function(x){return '<tr><td>'+fmtD(x.data)+'</td><td>'+esc(x.desc)+'</td><td>'+esc(x.cat)+'</td><td class="r">'+brl(x.valor)+'</td></tr>'}).join('');
  var abertas=S.unidades.filter(function(u){return !paid(u)});
  w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prestação de contas '+esc(MES_LABEL)+'</title><style>body{font:13px Arial,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:22px 0 6px}p{margin:2px 0;color:#444}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:5px 6px;text-align:left}th{background:#f2f2f2}.r{text-align:right}.sum{display:flex;gap:24px;margin:14px 0}.sum div{border:1px solid #ccc;border-radius:6px;padding:8px 14px}.sum b{display:block;font-size:16px}</style></head><body><h1>Prestação de contas · '+esc(MES_LABEL)+'</h1><p>'+esc(COND)+'</p><div class="sum"><div>Arrecadado<b>'+brl(arrec)+'</b></div><div>Esperado<b>'+brl(esp)+'</b></div><div>Em aberto<b>'+brl(esp-arrec)+'</b></div><div>Despesas<b>'+brl(desp)+'</b></div><div>Saldo do mês<b>'+brl(arrec-desp)+'</b></div></div><h2>Cobranças por unidade ('+abertas.length+' em aberto)</h2><table><thead><tr><th>Unidade</th><th>Responsável</th><th class="r">Total</th><th>Situação</th></tr></thead><tbody>'+rows+'</tbody></table><h2>Despesas do mês</h2><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th></tr></thead><tbody>'+(dr||'<tr><td colspan="4">Nenhuma despesa lançada.</td></tr>')+'</tbody></table><p style="margin-top:18px">Gerado em '+new Date().toLocaleString('pt-BR')+'</p></body></html>');
  w.document.close();w.focus();setTimeout(function(){w.print()},300)}
function vFin(){
  var late=isLate(MES);
  var cob=finList().map(function(u){var p=paid(u),c=cobranca(u);return '<tr><td class="num"><b>'+esc(uLabel(u))+'</b></td><td>'+esc(u.dono)+'</td><td class="num">'+brl(c.taxa)+'</td><td class="num">'+brl(c.agua)+'</td><td class="num">'+brl(c.gas)+'</td>'+tdTaxas(u)+'<td class="num">'+(c.aluguel?brl(c.aluguel):'—')+'</td><td class="num"><b>'+brl(c.total)+'</b></td><td><span class="pill '+(p?'ok':late?'bad':'warn')+'">'+(p?'Pago':late?'Em atraso':'A vencer')+'</span></td><td><div class="row-actions">'+
    (p?'<button class="btn sm ghost" data-unpay="'+u.id+'">Estornar</button>':'<button class="btn sm" data-pay="'+u.id+'">Marcar como pago</button><button class="btn sm ghost" data-copy="'+u.id+'">Copiar cobrança</button>'+(waCobranca(u)?'<a class="btn sm wa" target="_blank" rel="noopener noreferrer" href="'+waCobranca(u)+'">WhatsApp</a>':''))+'</div></td></tr>'}).join('');
  var dsp=despMes().slice().sort(function(a,b){return b.data.localeCompare(a.data)}).map(function(d){return '<tr><td class="num">'+fmtD(d.data)+'</td><td>'+esc(d.desc)+'</td><td><span class="pill mute">'+esc(d.cat)+'</span></td><td class="num">'+brl(d.valor)+'</td><td><button class="btn sm danger" data-del-desp="'+d.id+'">Excluir</button></td></tr>'}).join('');
  var tabs=[['cobrancas','Cobranças do mês'],['despesas','Despesas do condomínio'],['meios','Meios de pagamento']];
  var tabBar='<div class="subtabs" role="tablist" aria-label="Seções do financeiro">'+tabs.map(function(t){return '<button type="button" role="tab" data-ftab="'+t[0]+'" aria-selected="'+(t[0]===financeTab)+'">'+t[1]+'</button>'}).join('')+'</div>';
  var cobrancas='<div class="panel"><h3>Cobranças automáticas</h3><p class="note">O sistema calcula taxa padrão, água, gás, taxas adicionais vigentes e aluguel quando configurado. Recalcular é seguro: lançamentos pagos são preservados.</p><button class="btn" data-generate-bills>Gerar/recalcular cobranças de '+esc(MES_LABEL)+'</button></div>'+
  '<div class="panel"><h3>Cobranças de '+esc(MES_LABEL)+'</h3>'+finToolbar()+'<p class="note"><label for="c-alu-fin">Aluguel na cobrança: </label><select id="c-alu-fin" style="width:auto"><option value="nao'+(!S.config.cobrarAluguel?'" selected':'"')+'>Repasse ao proprietário (fora do total)</option><option value="sim'+(S.config.cobrarAluguel?'" selected':'"')+'>Somar ao total a pagar</option></select></p><div class="tablewrap"><table><thead><tr><th>Unidade</th><th>Responsável</th><th>Taxa</th><th>Água</th><th>Gás</th>'+thTaxas()+'<th>Aluguel</th><th>Total a pagar</th><th>Situação</th><th></th></tr></thead><tbody>'+(cob||'<tr><td colspan="12" class="empty">Nenhuma unidade encontrada.</td></tr>')+'</tbody></table></div></div>';
  var despesas='<div class="panel"><h3>Lançar despesa</h3><form class="f" id="f-desp">'+
   '<label>Descrição<input id="d-desc" required></label>'+
   '<label>Categoria<select id="d-cat"><option>Pessoal</option><option>Consumo</option><option>Manutenção</option><option>Serviços</option><option>Reserva</option></select></label>'+
   '<label>Valor (R$)<input id="d-valor" type="number" min="0.01" step="0.01" required></label>'+
   '<label>Data<input id="d-data" type="date" required value="'+MES+'-15"></label>'+
   '<button class="btn" type="submit">Lançar despesa</button></form></div>'+
  '<div class="panel"><h3>Despesas do condomínio · '+esc(MES_LABEL)+'</h3><div class="toolbar"><button class="btn sm ghost" type="button" data-export-desp>Exportar CSV</button></div><div class="tablewrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead><tbody>'+dsp+'</tbody><tfoot><tr><td colspan="3"><b>Total</b></td><td class="num"><b>'+brl(totalDespesas())+'</b></td><td></td></tr></tfoot></table></div></div>';
  return head('Financeiro',MES_LABEL+' · vencimento no dia '+Number(S.config.vencimentoDia||10))+tabBar+(financeTab==='despesas'?despesas:financeTab==='meios'?vPag(true):cobrancas);
}

function vTaxas(){
  var mo=function(sel){return MESES.map(function(m){return '<option value="'+m+'"'+(m===sel?' selected':'')+'>'+mesLabel(m)+'</option>'}).join('')};
  var somaMes=S.unidades.reduce(function(s,u){return s+cobranca(u).extrasTotal},0);
  var rows=S.taxas.map(function(t){
    var alvo=taxaAlvo(t),vig=taxaVigente(t,MES);
    var por=alvo.length?(t.modo==='rateio'?r2(t.valor/alvo.length):r2(t.valor)):0;
    var aplic=t.aplica==='todas'?'Todos os apartamentos':t.aplica==='ocupadas'?'Apartamentos ocupados':'Escolhidos: '+alvo.map(uLabel).join(', ');
    var st=vig?'<span class="pill ok">Ativa</span>':(MES<t.inicio?'<span class="pill warn">Começa em '+mesCurto(t.inicio)+'</span>':'<span class="pill mute">Encerrada</span>');
    return '<tr><td><b>'+esc(t.nome)+'</b></td><td class="num">'+brl(t.valor)+(t.modo==='rateio'?' no total':' por apto')+'</td><td>'+aplic+'</td><td class="num">'+(vig?brl(por)+' por apto':'—')+'</td><td class="num">'+mesCurto(t.inicio)+(t.fim?' a '+mesCurto(t.fim):' em diante')+'</td><td>'+st+'</td><td><div class="row-actions">'+(vig&&!t.fim?'<button class="btn sm ghost" data-end-taxa="'+t.id+'">Encerrar após este mês</button>':'')+'<button class="btn sm danger" data-del-taxa="'+t.id+'">Excluir</button></div></td></tr>'}).join('');
  return head('Taxas adicionais','Lixo, esgoto, fundo de reserva e outras cobranças por apartamento')+
  '<div class="panel"><h3>Nova taxa</h3><form class="f" id="f-taxa">'+
   '<label>Nome da taxa<input id="t-nome" required placeholder="Taxa de lixo"></label>'+
   '<label>Valor (R$)<input id="t-valor" type="number" min="0.01" step="0.01" required></label>'+
   '<label>Como cobrar<select id="t-modo"><option value="fixa">Valor fixo por apartamento</option><option value="rateio">Valor total dividido entre os apartamentos</option></select></label>'+
   '<label>Cobrar de<select id="t-aplica"><option value="todas">Todos os apartamentos</option><option value="ocupadas">Somente apartamentos ocupados</option><option value="selecionadas">Apenas os marcados abaixo</option></select></label>'+
   '<label>A partir de<select id="t-ini">'+mo(MES)+'</select></label>'+
   '<label>Até<select id="t-fim"><option value="">Sem data final</option>'+mo('')+'</select></label>'+
   '<div class="wide"><span style="font-size:12px;color:var(--muted)">Apartamentos (vale só para "Apenas os marcados")</span><div class="checks">'+
    S.unidades.map(function(u){return '<label class="chk"><input type="checkbox" id="tu-'+u.id+'">'+esc(uLabel(u))+'</label>'}).join('')+'</div></div>'+
   '<button class="btn" type="submit">Cadastrar taxa</button></form>'+
  '<p class="note">Total de taxas adicionais em '+MES_LABEL+': <b class="num">'+brl(somaMes)+'</b>. Cada taxa entra no total a pagar de cada apartamento na aba Financeiro.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>Taxa</th><th>Valor</th><th>Cobrada de</th><th>Em '+mesCurto(MES)+'</th><th>Vigência</th><th>Situação</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="empty">Nenhuma taxa adicional cadastrada.</td></tr>')+'</tbody></table></div></div>';
}

var TIPOS={pix:'PIX',transferencia:'Transferência bancária',boleto:'Boleto',dinheiro:'Dinheiro ou cheque',mercadopago:'Mercado Pago'};
function meioResumo(m){var d=m.dados||{};
  if(m.tipo==='pix')return esc((d.tipoChave||'Chave')+': '+(d.chave||'—')+(d.favorecido?' · '+d.favorecido:''));
  if(m.tipo==='transferencia')return esc((d.banco||'Banco')+' · ag. '+(d.agencia||'—')+' · conta '+(d.conta||'—')+(d.favorecido?' · '+d.favorecido:''));
  if(m.tipo==='mercadopago'){var f=[['pix','Pix'],['cartao','cartão'],['boleto','boleto']].filter(function(x){return d[x[0]]}).map(function(x){return x[1]}).join(', ');return esc('Checkout Mercado Pago · aceita '+(f||'—'))}
  return esc(m.instrucoes||'—')}
function g(tipos,html){return '<label data-tipos="'+tipos+'"'+(tipos.split(' ').indexOf('pix')<0?' hidden':'')+'>'+html+'</label>'}
function vPag(inFinance){
  var active=S.meios.find(function(m){return m.ativo}),mode=MP_CONFIG.mode||(active?active.tipo:null)||'pix';
  var pix=active&&active.tipo==='pix'?active.dados||{}:{};
  var mp=MP_CONFIG.mercadoPago||{},mpData=active&&active.tipo==='mercadopago'?active.dados||{}:{};
  var linhas=active?'<tr><td><span class="pill mute">'+TIPOS[active.tipo]+'</span></td><td>'+meioResumo(active)+'</td><td><span class="pill ok">Ativo</span></td></tr>':'';
  var infos=S.pagamentos.slice().sort(function(a,b){return b.data.localeCompare(a.data)}).map(function(x){var cls=x.status==='Confirmado'?'ok':x.status==='Recusado'?'bad':'warn';
    return '<tr><td class="num">'+fmtDT(x.data)+'</td><td class="num">'+esc(x.unidade)+'</td><td>'+mesLabel(x.mes)+'</td><td class="num">'+brl(x.valor)+'</td><td>'+esc(x.meio)+'</td><td><span class="pill '+cls+'">'+x.status+'</span></td><td>'+(x.status==='Aguardando conferência'?'<div class="row-actions"><button class="btn sm" data-pag-ok="'+x.id+'">Confirmar</button><button class="btn sm danger" data-pag-no="'+x.id+'">Recusar</button></div>':'')+'</td></tr>'}).join('');
  return (inFinance?'':head('Meios de pagamento','Como os moradores pagam as faturas: manual ou pelo Mercado Pago'))+
  '<div class="panel"><h3>Forma de pagamento do condomínio</h3><p class="note">Escolha apenas uma opção. A outra ficará desativada para os moradores.</p><form class="f" id="f-payment-config">'+
   '<div class="wide payment-mode-options"><label class="payment-mode-choice"><input type="radio" name="payment-mode" id="pay-mode-pix" value="pix"'+(mode==='pix'?' checked':'')+'><span><b>Pix manual</b><small>O morador paga pela chave e informa o pagamento para conferência.</small></span></label><label class="payment-mode-choice"><input type="radio" name="payment-mode" id="pay-mode-mp" value="mercadopago"'+(mode==='mercadopago'?' checked':'')+'><span><b>Mercado Pago</b><small>Checkout com Pix, cartão e boleto habilitados.</small></span></label></div>'+
   '<div class="wide payment-config-section" data-payment-section="pix"'+(mode==='pix'?'':' hidden')+'><h4>Dados do Pix manual</h4><div class="payment-fields"><label>Tipo da chave<select id="p-tipochave"><option'+(pix.tipoChave==='CNPJ'?' selected':'')+'>CNPJ</option><option'+(pix.tipoChave==='CPF'?' selected':'')+'>CPF</option><option'+(pix.tipoChave==='E-mail'?' selected':'')+'>E-mail</option><option'+(pix.tipoChave==='Telefone'?' selected':'')+'>Telefone</option><option'+(pix.tipoChave==='Chave aleatória'?' selected':'')+'>Chave aleatória</option></select></label><label>Chave Pix<input id="p-chave" value="'+esc(pix.chave||'')+'" placeholder="Chave Pix do condomínio"></label><label class="wide">Nome do favorecido<input id="p-fav" value="'+esc(pix.favorecido||'')+'" placeholder="Razão social ou titular"></label><label class="wide">Instruções ao morador<textarea id="p-instr-pix" rows="2" placeholder="Prazo e como informar o pagamento">'+esc(active&&active.tipo==='pix'?active.instrucoes||'':'')+'</textarea></label></div></div>'+
   '<div class="wide payment-config-section" data-payment-section="mercadopago"'+(mode==='mercadopago'?'':' hidden')+'><h4>Credenciais do Mercado Pago</h4><div class="payment-fields"><label>Public Key<input id="p-mppk" value="'+esc(mp.publicKey||mpData.publicKey||'')+'" placeholder="APP_USR-..." autocomplete="off"></label><label>Access Token<input id="p-mptoken" type="password" value="" placeholder="'+(mp.hasAccessToken?'Token salvo · deixe em branco para manter':'APP_USR-...')+'" autocomplete="new-password"></label></div><div class="checks payment-checks"><label class="chk"><input type="checkbox" id="p-mp-pix"'+(mp.pix!==false?' checked':'')+'>Pix</label><label class="chk"><input type="checkbox" id="p-mp-cartao"'+(mp.cartao!==false?' checked':'')+'>Cartão</label><label class="chk"><input type="checkbox" id="p-mp-boleto"'+(mp.boleto!==false?' checked':'')+'>Boleto</label></div><p class="note">O Access Token é validado no Mercado Pago e cifrado no servidor. Ele não fica salvo no navegador nem é exibido novamente. A Public Key é pública e pode ser visualizada.</p></div>'+
   (MP_CONFIG_ERROR?'<p class="wide pill warn">'+esc(MP_CONFIG_ERROR)+'</p>':'')+'<button class="btn" type="submit">Salvar forma de pagamento</button></form>'+
  '<h3 style="margin-top:20px">Meio ativo para os moradores</h3><div class="tablewrap"><table><thead><tr><th>Tipo</th><th>Dados exibidos</th><th>Situação</th></tr></thead><tbody>'+(linhas||'<tr><td colspan="3" class="empty">Nenhuma forma de pagamento configurada.</td></tr>')+'</tbody></table></div></div>'+
  '<div class="panel"><h3>Pagamentos informados pelos moradores</h3><div class="tablewrap"><table><thead><tr><th>Data</th><th>Unidade</th><th>Mês</th><th>Valor</th><th>Meio</th><th>Situação</th><th></th></tr></thead><tbody>'+(infos||'<tr><td colspan="7" class="empty">Nenhum pagamento informado ainda.</td></tr>')+'</tbody></table></div></div>';
}
async function registrarPag(m,status){var u=unitByLabel(MY)||S.unidades[0],resident=role==='morador',bill=resident?cobrancaMorador(MES):null,c=resident?{total:bill.total}:cobranca(u);
  if(resident){if(!CURRENT_MORADOR||!bill.items.length){flash('Ainda não há cobrança lançada para este mês.');return}var inserted=await supabase.from('pagamentos_morador').insert({condominio_id:CONDO_ID,unidade_id:u.id,morador_id:CURRENT_MORADOR.id,competencia:MES+'-01',valor:c.total,meio_pagamento_id:m.id||null,meio_nome_snapshot:m.nome,status:'aguardando_conferencia'}).select().single();if(inserted.error){flash('Não foi possível registrar o pagamento: '+inserted.error.message);return}S.pagamentos.unshift({id:inserted.data.id,unidadeId:u.id,unidade:uLabel(u),mes:MES,valor:c.total,meio:m.nome,meioId:m.id,data:inserted.data.informado_em,status:'Aguardando conferência'});render();return}
  S.pagamentos.push({id:uid(),unidadeId:u.id,unidade:uLabel(u),mes:MES,valor:c.total,meio:m.nome,meioId:m.id,data:now(),status:status});
  if(status==='Confirmado')u.pago[MES]=true;save()}
function pagarHtml(u,c,p){
  var h='<div class="panel" id="resident-payment-options" tabindex="-1" style="margin-bottom:16px"><h3>Como pagar</h3>';
  var regs=S.pagamentos.filter(function(x){return x.unidadeId===u.id&&x.mes===MES}),ult=regs[regs.length-1];
  if(p)return h+'<p class="note" style="margin:0">Pagamento de '+MES_LABEL+' confirmado'+(ult&&ult.status==='Confirmado'?' via '+esc(ult.meio):'')+'.</p></div>';
  var ativos=S.meios.filter(function(m){return m.ativo});
  if(!ativos.length)return h+'<p class="empty">O síndico ainda não cadastrou meios de pagamento.</p></div>';
  h+='<p class="note">Valor a pagar: <b class="num">'+brl(c.total)+'</b></p>';
  if(ult&&ult.status==='Aguardando conferência')h+='<p class="note"><span class="pill warn">Aguardando conferência</span> Você avisou o pagamento em '+fmtDT(ult.data)+' via '+esc(ult.meio)+'. O síndico vai confirmar.</p>';
  if(ult&&ult.status==='Recusado')h+='<p class="note"><span class="pill bad">Recusado</span> O síndico não confirmou o pagamento enviado via '+esc(ult.meio)+'. Confira o valor e avise de novo.</p>';
  return h+'<div class="list">'+ativos.map(function(m){
    var acao=m.tipo==='mercadopago'?'<button class="btn sm" data-mp="'+m.id+'">Pagar com Mercado Pago (simulação)</button>':
      (m.tipo==='pix'?'<button class="btn sm ghost" data-copy-key="'+m.id+'">Copiar chave PIX</button>':'')+'<button class="btn sm" data-informar="'+m.id+'">Informar pagamento</button>';
    return '<div class="item"><div><b>'+esc(m.nome)+'</b><p>'+meioResumo(m)+'</p>'+(m.instrucoes?'<p>'+esc(m.instrucoes)+'</p>':'')+'</div><div class="row-actions">'+acao+'</div></div>'}).join('')+'</div></div>';
}

var leitTab='agua';
function rin(form,pref,u,val,lab,ro){return '<td><input class="mini num" form="'+form+'" id="'+pref+u.id+'" type="number" min="0" step="0.001" value="'+val+'"'+(ro?' readonly title="Igual à leitura atual do mês anterior"':'')+' aria-label="'+lab+' '+uLabel(u)+'"></td>'}
function leitTable(k,form,pa,pb,nomeU){
  var rows='',totV=0,totM=0;
  S.unidades.forEach(function(u){
    var r=getRead(u,k,MES),cb=cobranca(u),val=k==='agua'?cb.agua:cb.gas;totV+=val;totM+=lei(u,k);
    rows+='<tr><td class="num"><b>'+esc(uLabel(u))+'</b><br><small style="color:var(--muted)">'+u.situacao+'</small></td>'+
      rin(form,pa,u,r[0],nomeU+' anterior',r[3])+rin(form,pb,u,r[1],nomeU+' atual')+
      '<td class="num">'+lei(u,k).toFixed(3)+' m³</td><td class="num">'+brl(val)+'</td></tr>'});
  return '<div class="tablewrap"><table><thead><tr><th>Unidade</th><th>Leitura anterior</th><th>Leitura atual</th><th>Consumo</th><th>Valor a cobrar</th></tr></thead><tbody>'+rows+
    '</tbody><tfoot><tr><td colspan="3"><b>Total</b></td><td class="num"><b>'+totM.toFixed(3)+' m³</b></td><td class="num"><b>'+brl(r2(totV))+'</b></td></tr></tfoot></table></div>';
}
function semLeitura(k){return S.unidades.every(function(u){return !getRead(u,k,MES)[2]})}
function vLeitAgua(){
  var c=S.config;
  var regra=c.modoAgua==='individual'?'Cada apartamento paga seu consumo pelo valor por m³.':c.modoAgua==='consumo'?'A conta de água do condomínio é dividida em proporção ao consumo de cada hidrômetro.':'A conta de água do condomínio é dividida em partes iguais entre os apartamentos ocupados.';
  return '<div class="panel"><h3>Água de '+MES_LABEL+'</h3><p class="note">'+regra+(semLeitura('agua')?' Ainda não há leitura deste mês: a leitura anterior já vem preenchida, informe a leitura atual de cada unidade.':'')+'</p>'+
   '<form class="f" id="f-agua">'+
   '<label>Conta total de água do mês (R$)<input id="c-agua" type="number" min="0" step="0.01" value="'+contaAguaDe(MES)+'"></label><label>Tarifa individual de água (R$/m³)<input id="c-agua-tarifa" type="number" min="0" step="0.0001" value="'+Number(c.tarifaAgua||0)+'"></label>'+
   '<label>Forma de cobrança<select id="c-modo"><option value="consumo"'+(c.modoAgua==='consumo'?' selected':'')+'>Ratear conforme o consumo</option><option value="igual"'+(c.modoAgua==='igual'?' selected':'')+'>Ratear em partes iguais</option><option value="individual"'+(c.modoAgua==='individual'?' selected':'')+'>Medidor e cobrança individual</option></select></label>'+
   '<button class="btn" type="submit">Salvar água e recalcular</button></form>'+
   leitTable('agua','f-agua','aa-','ab-','Água')+'</div>';
}
function vLeitGas(){
  return '<div class="panel"><h3>Gás de '+MES_LABEL+'</h3><p class="note">O gás é cobrado pelo consumo medido de cada apartamento vezes a tarifa por m³.'+(semLeitura('gas')?' Ainda não há leitura deste mês: a leitura anterior já vem preenchida, informe a leitura atual de cada unidade.':'')+'</p>'+
   '<form class="f" id="f-gas">'+
   '<label>Tarifa do gás (R$ por m³)<input id="c-gas" type="number" min="0" step="0.01" value="'+tarifaDe(MES)+'"></label>'+
   '<button class="btn" type="submit">Salvar gás e recalcular</button></form>'+
   leitTable('gas','f-gas','ga-','gb-','Gás')+'</div>';
}
function histTable(k){
  var ms=MESES.filter(function(m){return m<=MES}).slice(-6),nome=k==='gas'?'gás':'água';
  var hh=ms.map(function(m){return '<th>'+mesCurto(m)+'</th>'}).join('');
  var hr=S.unidades.map(function(u){return '<tr><td class="num"><b>'+esc(uLabel(u))+'</b></td>'+ms.map(function(m){var r=getRead(u,k,m);return '<td class="num">'+(r[2]?leiM(u,k,m).toFixed(1):'—')+'</td>'}).join('')+'</tr>'}).join('');
  var soma=function(m){var t=0;S.unidades.forEach(function(u){t+=leiM(u,k,m)});return t};
  var tm=ms.map(function(m){return '<td class="num"><b>'+soma(m).toFixed(1)+'</b></td>'}).join('');
  var tv=ms.map(function(m){return '<td class="num"><b>'+brl(k==='gas'?r2(soma(m)*tarifaDe(m)):contaAguaDe(m))+'</b></td>'}).join('');
  return '<div class="panel"><h3>Consumo de '+nome+' por apartamento (m³)</h3><div class="tablewrap"><table><thead><tr><th>Unidade</th>'+hh+'</tr></thead><tbody>'+hr+'</tbody><tfoot><tr><td><b>Total em m³</b></td>'+tm+'</tr><tr><td><b>'+(k==='gas'?'Valor do gás':'Conta de água')+'</b></td>'+tv+'</tr></tfoot></table></div></div>';
}
function vLeitHist(){
  return '<p class="note">Cada mês parte da leitura atual do mês anterior. Os últimos 6 meses até '+MES_LABEL+'.</p>'+histTable('gas')+histTable('agua');
}
function saveReads(k,pa,pb){
  var bad='',num=function(i){return parseFloat(document.getElementById(i).value)||0};
  S.unidades.forEach(function(u){var a=[num(pa+u.id),num(pb+u.id)];if(a[1]<a[0]&&!bad)bad=uLabel(u)});
  if(bad)return bad;
  S.unidades.forEach(function(u){var a=[num(pa+u.id),num(pb+u.id)];u.leituras=u.leituras||{};var L=u.leituras[MES]=u.leituras[MES]||{};L[k]=a});
  return bad;
}
function vLeit(){
  var tabs=[['agua','Água'],['gas','Gás'],['hist','Histórico']];
  var bar='<div class="subtabs" role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" data-ltab="'+t[0]+'" aria-selected="'+(t[0]===leitTab)+'">'+t[1]+'</button>'}).join('')+'</div>';
  var body=leitTab==='agua'?vLeitAgua():leitTab==='gas'?vLeitGas():vLeitHist();
  return head('Leituras e rateios',MES_LABEL+' · leituras mensais de água e gás por apartamento')+bar+body;
}

var portTab='vis';
function waLink(u,e){
  var d=((u&&u.tel)||'').replace(/\D/g,'');if(d.length<10)return '';if(d.length<=11)d='55'+d;
  var nome=(u.morador&&u.morador!=='—')?u.morador:u.dono;
  var msg='Olá, '+nome+'! Chegou uma encomenda'+(e.transp?' ('+e.transp+')':'')+' para o apartamento '+e.unidade+' na portaria do '+COND+'. Pode retirar quando quiser. Obrigado!';
  return 'https://wa.me/'+d+'?text='+encodeURIComponent(msg)}
function pVis(){
  var vis=S.visitantes.slice().sort(function(a,b){return b.entrada.localeCompare(a.entrada)}).map(function(v){return '<tr><td>'+esc(v.nome)+'<br><small class="num" style="color:var(--muted)">'+esc(v.doc)+'</small></td><td class="num">'+esc(v.unidade)+'</td><td class="num">'+fmtDT(v.entrada)+'</td><td>'+(v.saida?'<span class="num">'+fmtDT(v.saida)+'</span>':'<button class="btn sm" data-out="'+v.id+'">Registrar saída</button>')+'</td></tr>'}).join('');
  return '<div class="panel"><h3>Registrar visitante</h3><form class="f" id="f-vis">'+
   '<label>Nome<input id="v-nome" required></label><label>Documento<input id="v-doc" placeholder="RG ou CPF"></label>'+
   '<label>Unidade visitada<select id="v-un">'+unitOptions()+'</select></label><button class="btn" type="submit">Registrar entrada</button></form>'+
  '<div class="tablewrap"><table><thead><tr><th>Visitante</th><th>Unidade</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>'+vis+'</tbody></table></div></div>';
}
function pPrest(){
  var rows=S.prestadores.slice().sort(function(a,b){return b.entrada.localeCompare(a.entrada)}).map(function(x){return '<tr><td>'+esc(x.nome)+'<br><small class="num" style="color:var(--muted)">'+esc(x.doc)+'</small></td><td>'+esc(x.empresa)+'<br><small style="color:var(--muted)">'+esc(x.servico)+'</small></td><td class="num">'+esc(x.unidade)+'</td><td>'+esc(x.autorizado)+'</td><td class="num">'+fmtDT(x.entrada)+'</td><td>'+(x.saida?'<span class="num">'+fmtDT(x.saida)+'</span>':'<button class="btn sm" data-pout="'+x.id+'">Registrar saída</button>')+'</td></tr>'}).join('');
  return '<div class="panel"><h3>Registrar prestador de serviço</h3><form class="f" id="f-prest">'+
   '<label>Nome<input id="s-nome" required></label><label>Documento<input id="s-doc" placeholder="RG ou CPF"></label>'+
   '<label>Empresa<input id="s-emp"></label><label>Serviço<input id="s-serv" required placeholder="Reparo, instalação, limpeza..."></label>'+
   '<label>Unidade<select id="s-un">'+unitOptions()+'</select></label><label>Autorizado por<input id="s-aut" placeholder="Morador ou síndico"></label>'+
   '<button class="btn" type="submit">Registrar entrada</button></form>'+
  '<div class="tablewrap"><table><thead><tr><th>Prestador</th><th>Empresa e serviço</th><th>Unidade</th><th>Autorizado por</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="empty">Nenhum prestador registrado.</td></tr>')+'</tbody></table></div></div>';
}
function pVei(){
  var vl=function(x){return '<td class="num"><b>'+esc(x.placa)+'</b></td><td>'+esc(x.modelo)+'<br><small style="color:var(--muted)">'+esc(x.cor)+'</small></td>'};
  var mor=S.veiculos.filter(function(x){return x.tipo==='Morador'}).sort(function(a,b){return a.unidade.localeCompare(b.unidade)}).map(function(x){return '<tr>'+vl(x)+'<td class="num">'+esc(x.unidade)+'</td><td class="num">'+esc(x.vaga)+'</td><td><button class="btn sm danger" data-del-vei="'+x.id+'">Remover</button></td></tr>'}).join('');
  var mov=S.veiculos.filter(function(x){return x.tipo!=='Morador'}).sort(function(a,b){return b.entrada.localeCompare(a.entrada)}).map(function(x){return '<tr>'+vl(x)+'<td><span class="pill mute">'+x.tipo+'</span></td><td class="num">'+esc(x.unidade)+'</td><td class="num">'+esc(x.vaga)+'</td><td class="num">'+fmtDT(x.entrada)+'</td><td>'+(x.saida?'<span class="num">'+fmtDT(x.saida)+'</span>':'<button class="btn sm" data-vout="'+x.id+'">Registrar saída</button>')+'</td></tr>'}).join('');
  return '<div class="panel"><h3>Registrar veículo</h3><form class="f" id="f-vei">'+
   '<label>Placa<input id="w-placa" required maxlength="8" placeholder="ABC-1D23" style="text-transform:uppercase"></label>'+
   '<label>Modelo<input id="w-modelo" required placeholder="Fiat Argo"></label><label>Cor<input id="w-cor" required></label>'+
   '<label>Tipo<select id="w-tipo"><option>Morador</option><option>Visitante</option><option>Prestador</option></select></label>'+
   '<label>Unidade<select id="w-un">'+unitOptions()+'</select></label><label>Vaga<input id="w-vaga" placeholder="12 ou V1"></label>'+
   '<button class="btn" type="submit">Registrar veículo</button></form>'+
  '<h3 style="margin-bottom:8px">Veículos dos moradores</h3><div class="tablewrap"><table><thead><tr><th>Placa</th><th>Veículo</th><th>Unidade</th><th>Vaga</th><th></th></tr></thead><tbody>'+(mor||'<tr><td colspan="5" class="empty">Nenhum veículo de morador cadastrado.</td></tr>')+'</tbody></table></div></div>'+
  '<div class="panel"><h3>Visitantes e prestadores com veículo</h3><div class="tablewrap"><table><thead><tr><th>Placa</th><th>Veículo</th><th>Tipo</th><th>Unidade</th><th>Vaga</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>'+(mov||'<tr><td colspan="7" class="empty">Nenhum veículo em movimento.</td></tr>')+'</tbody></table></div></div>';
}
function pEnc(){
  var enc=S.encomendas.slice().sort(function(a,b){return b.chegada.localeCompare(a.chegada)}).map(function(e){
    var u=unitByLabel(e.unidade),link=u?waLink(u,e):'',nome=u?((u.morador&&u.morador!=='—')?u.morador:u.dono):'';
    var wa=e.retirada?'<span style="color:var(--muted)">—</span>':(link?'<a class="btn sm wa" data-aviso="'+e.id+'" href="'+link+'" target="_blank" rel="noopener noreferrer">Avisar no WhatsApp</a>'+(e.avisado?'<br><small style="color:var(--muted)">Avisado '+fmtDT(e.avisado)+'</small>':''):'<span class="pill mute">Sem telefone</span>');
    return '<tr><td class="num"><b>'+esc(e.unidade)+'</b></td><td>'+esc(nome)+'<br><small class="num" style="color:var(--muted)">'+esc(u?u.tel:'—')+'</small></td><td>'+esc(e.transp)+'</td><td class="num">'+fmtDT(e.chegada)+'</td><td>'+wa+'</td><td>'+(e.retirada?'<span class="pill ok">Entregue '+fmtDT(e.retirada)+'</span>':'<button class="btn sm" data-pick="'+e.id+'">Entregar ao morador</button>')+'</td></tr>'}).join('');
  return '<div class="panel"><h3>Registrar encomenda</h3><form class="f" id="f-enc">'+
   '<label>Unidade<select id="e-un">'+unitOptions()+'</select></label><label>Transportadora<input id="e-tr" required placeholder="Correios, Shopee..."></label>'+
   '<button class="btn" type="submit">Registrar chegada</button></form>'+
  '<p class="note">O botão do WhatsApp abre a conversa com o morador e a mensagem de aviso já escrita. Confira o texto e envie.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>Unidade</th><th>Morador e WhatsApp</th><th>Transportadora</th><th>Chegada</th><th>Aviso</th><th>Situação</th></tr></thead><tbody>'+enc+'</tbody></table></div></div>';
}
function vPortaria(){
  var pend=S.encomendas.filter(function(e){return !e.retirada}).length;
  var tabs=[['vis','Visitantes'],['prest','Prestadores'],['vei','Veículos'],['enc','Encomendas'+(pend?' ('+pend+')':'')]];
  var bar='<div class="subtabs" role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" data-ptab="'+t[0]+'" aria-selected="'+(t[0]===portTab)+'">'+t[1]+'</button>'}).join('')+'</div>';
  var body=portTab==='vis'?pVis():portTab==='prest'?pPrest():portTab==='vei'?pVei():pEnc();
  return head('Portaria','Visitantes, prestadores de serviço, veículos e encomendas')+bar+body;
}

function vEquipePortaria(){
  var staff=(PORTARIA_CONFIG.equipe||[]).map(function(x){return '<div class="item"><div><b>'+esc(x.nome||'Porteiro')+'</b><p>'+esc(x.email||'')+' · '+esc(x.status||'Acesso ativo')+'</p></div><button class="btn sm danger" type="button" data-portaria-remove="'+esc(x.id)+'">Remover acesso</button></div>'}).join('')||'<p class="empty">Nenhum porteiro ou vigilante cadastrado.</p>';
  var enabled=PORTARIA_CONFIG.habilitada;
  return head('Equipe da portaria','Habilite o módulo e convide os profissionais que terão acesso à portaria.')+
    (PORTARIA_CONFIG_ERROR?'<p class="pill warn">'+esc(PORTARIA_CONFIG_ERROR)+'</p>':'')+
    '<div class="panel"><h3>Módulo Portaria</h3><p class="note">Quando desabilitado, a equipe não consegue acessar registros de visitantes, veículos ou encomendas.</p><form class="f" id="f-portaria-settings"><label class="wide chk"><input id="portaria-enabled" type="checkbox" '+(enabled?'checked':'')+'> Habilitar o módulo Portaria neste condomínio</label><button class="btn" type="submit">Salvar configuração</button></form></div>'+
    '<div class="grid"><div class="panel"><h3>Convidar porteiro ou vigilante</h3>'+(enabled?'<p class="note">O profissional receberá um convite por e-mail para criar a senha de acesso.</p><form class="f" id="f-portaria-staff"><label>Nome<input id="staff-nome" required autocomplete="name"></label><label>E-mail<input id="staff-email" type="email" required autocomplete="email"></label><button class="btn" type="submit">Enviar convite</button></form>':'<p class="note">Habilite o módulo para convidar profissionais.</p>')+'</div><div class="panel"><h3>Acessos cadastrados</h3><div class="list">'+staff+'</div></div></div>';
}

function vComm(){
  var sind=role==='sindico';
  var not=S.comunicados.slice().sort(function(a,b){return b.data.localeCompare(a.data)}).map(function(n){return '<div class="item"><div><b>'+esc(n.titulo)+'</b><p>'+esc(n.texto)+'</p><p class="num" style="font-size:12px">'+fmtD(n.data)+'</p></div>'+(sind?'<button class="btn sm danger" data-del-not="'+n.id+'">Excluir</button>':'')+'</div>'}).join('');
  var ch=S.chamados;
  var chHtml=ch.map(function(c){
    var cls=c.status==='Aberto'?'bad':c.status==='Em andamento'?'warn':'ok';
    var act=sind&&c.status!=='Resolvido'?'<button class="btn sm ghost" data-next="'+c.id+'">'+(c.status==='Aberto'?'Iniciar':'Resolver')+'</button>':'';
    return '<div class="item"><div><b>'+esc(c.titulo)+'</b><p>'+esc(c.unidade)+' · '+fmtD(c.data)+'</p></div><div class="row-actions"><span class="pill '+cls+'">'+c.status+'</span>'+act+'</div></div>'}).join('')||'<p class="empty">Nenhum chamado.</p>';
  var fNot=sind?'<form class="f" id="f-not"><label class="wide">Título<input id="n-tit" required></label><label class="wide">Mensagem<textarea id="n-txt" rows="3" required></textarea></label><button class="btn" type="submit">Publicar comunicado</button></form>':'';
  var fCh=sind?'<form class="f" id="f-ch"><label>Unidade<select id="c-un">'+unitOptions()+'</select></label><label class="wide">Descreva o problema<input id="c-tit" required></label><button class="btn" type="submit">Abrir chamado</button></form>':'';
  return head(sind?'Comunicados e chamados':'Comunicados',sind?'Avisos do condomínio e solicitações de manutenção':'Avisos do condomínio')+
  '<div class="grid"><div class="panel"><h3>Comunicados</h3>'+fNot+'<div class="list">'+(not||'<p class="empty">Nenhum comunicado.</p>')+'</div></div>'+
  (sind?'<div class="panel"><h3>Chamados dos moradores</h3>'+fCh+'<div class="list">'+chHtml+'</div></div>':'')+'</div>';
}
function vTenantCalls(unitLabel){
  var calls=S.chamados.filter(function(c){return c.unidade===unitLabel}).slice().sort(function(a,b){return b.data.localeCompare(a.data)});
  var items=calls.map(function(c){var cls=c.status==='Aberto'?'bad':c.status==='Em andamento'?'warn':'ok';return '<div class="item"><div><b>'+esc(c.titulo)+'</b><p>Aberto em '+fmtD(c.data)+'</p></div><span class="pill '+cls+'">'+esc(c.status)+'</span></div>'}).join('')||'<p class="empty">Você ainda não abriu chamados para esta unidade.</p>';
  return head('Meus chamados','Abra uma solicitação e acompanhe as atualizações da sua unidade.')+'<div class="panel"><h3>Nova solicitação</h3><form class="f" id="f-ch"><label class="wide">O que precisa de atendimento?<input id="c-tit" required placeholder="Ex.: manutenção no banheiro"></label><button class="btn" type="submit">Enviar chamado</button></form><h3>Histórico dos chamados</h3><div class="list">'+items+'</div></div>';
}

function vTenantEncomendas(){
  var ul=MY,enc=S.encomendas.filter(function(e){return e.unidade===ul}).slice().sort(function(a,b){return b.chegada.localeCompare(a.chegada)});
  var pend=enc.filter(function(e){return !e.retirada}).length;
  var list=enc.map(function(e){return '<div class="item"><div><b>'+esc(e.transp||'Encomenda')+'</b><p>Recebida em '+fmtDT(e.chegada)+'</p></div><span class="pill '+(e.retirada?'ok':'warn')+'">'+(e.retirada?'Retirada '+fmtDT(e.retirada):'Aguardando retirada')+'</span></div>'}).join('')||'<p class="empty">Nenhuma encomenda registrada para sua unidade.</p>';
  return head('Minhas encomendas',esc(ul)+' · acompanhe as entregas recebidas na portaria.')+'<div class="panel"><div class="item"><div><b>Encomendas pendentes</b><p>Itens aguardando retirada na portaria.</p></div><span class="pill '+(pend?'warn':'ok')+'">'+pend+'</span></div><div class="list">'+list+'</div></div>';
}

function vTenantPayment(){
  var u=unitByLabel(MY)||S.unidades[0],resident=role==='morador',own=resident?cobrancaMorador(MES):null,p=resident?own.paid:paid(u),c=resident?{total:own.total}:cobranca(u);
  var tr=function(l,v,cls){return '<tr'+(cls?' class="'+cls+'"':'')+'><td>'+l+'</td><td class="num">'+v+'</td></tr>'};
  var rows='';
  if(resident){rows=own.items.length?own.items.map(function(item){return tr(esc(item.descricao),brl(item.valor))}).join(''):tr('Cobrança do mês','Ainda não lançada');if(own.items.length)rows+=tr('Total a pagar',brl(c.total),'tot')}
  else{rows=tr('Taxa condominial',brl(c.taxa));c.extras.forEach(function(e){rows+=tr(esc(e.nome),brl(e.valor))});if(c.extras.length>1)rows+=tr('<i>Soma das taxas adicionais</i>','<i>'+brl(c.extrasTotal)+'</i>');rows+=tr('Água ('+lei(u,'agua').toFixed(1)+' m³)',brl(c.agua))+tr('Gás ('+lei(u,'gas').toFixed(1)+' m³)',brl(c.gas));if(c.aluguel)rows+=tr('Aluguel'+(S.config.cobrarAluguel?'':' (pago ao proprietário)'),brl(c.aluguel));rows+=tr(S.config.cobrarAluguel&&c.aluguel?'Total a pagar (com aluguel)':'Total a pagar ao condomínio',brl(c.total),'tot');if(c.aluguel&&!S.config.cobrarAluguel)rows+=tr('Total com aluguel',brl(r2(c.total+c.aluguel)),'tot')}
  var status=p?'<span class="pill ok">Pago</span>':(lateFor()?'<span class="pill bad">Em atraso</span>':'<span class="pill warn">A vencer</span>');
  return head('Pagamentos',esc(MES_LABEL)+' · Unidade '+esc(uLabel(u)))+'<div class="panel"><div class="item"><div><b>Situação da cobrança</b><p>Total deste mês: <strong class="num">'+brl(c.total)+'</strong></p></div>'+(own&&!own.items.length?'<span class="pill mute">Sem lançamento</span>':status)+'</div><h3>Detalhamento</h3><div class="tablewrap"><table><tbody>'+rows+'</tbody></table></div></div>'+pagarHtml(u,c,p);
}

function vMinha(){
  var u=unitByLabel(MY)||S.unidades[0],ul=uLabel(u),resident=role==='morador',own=resident?cobrancaMorador(MES):null;
  var p=resident?own.paid:paid(u),c=resident?{total:own.total}:cobranca(u),enc=S.encomendas.filter(function(e){return e.unidade===ul&&!e.retirada}).length,calls=S.chamados.filter(function(ch){return ch.unidade===ul&&ch.status!=='Resolvido'}).length;
  var st=p?'<span class="pill ok">Pago</span>':(lateFor()?'<span class="pill bad">Em atraso</span>':'<span class="pill warn">A vencer</span>');
  var unitDisplay=role==='morador'?'<div><small>Minha unidade</small><b>'+esc(ul)+'</b></div>':'<div><small>Ver unidade</small><select id="my-unit">'+S.unidades.map(function(x){var l=uLabel(x);return '<option'+(l===ul?' selected':'')+'>'+esc(l)+'</option>'}).join('')+'</select></div>';
  var news=S.comunicados.slice().sort(function(a,b){return b.data.localeCompare(a.data)})[0];
  var contract=resident?(u.contractPath?'<div class="panel resident-contract"><div><h3>Contrato de locação</h3><p class="note">'+esc(u.contractName||'Contrato anexado pelo síndico')+'</p></div><button class="btn" type="button" data-contract="'+esc(u.contractPath)+'">Abrir contrato</button></div>':'<div class="panel"><h3>Contrato de locação</h3><p class="empty">O síndico ainda não anexou um contrato para esta locação.</p></div>'):'';
  return head('Minha unidade',esc(COND)+' · '+esc(ul)+' · '+MES_LABEL)+
  '<div class="panel"><div class="unit-card">'+unitDisplay+'<div><small>Proprietário</small>'+esc(u.dono)+'</div><div><small>Moradores</small>'+esc(u.morador)+'</div><div><small>'+MES_LABEL+'</small>'+st+'</div></div></div>'+
  contract+'<div class="grid resident-shortcuts"><button class="panel resident-shortcut" type="button" data-nav="pagamentos"><small>Pagamento do mês</small><b>'+brl(c.total)+'</b><span>'+ (p?'Cobrança paga':own&&!own.items.length?'Cobrança ainda não lançada':'Ver cobrança e pagar')+'</span></button><button class="panel resident-shortcut" type="button" data-nav="chamados"><small>Meus chamados</small><b>'+calls+'</b><span>Solicitações em andamento</span></button><button class="panel resident-shortcut" type="button" data-nav="encomendas"><small>Encomendas</small><b>'+enc+'</b><span>Aguardando retirada</span></button></div>'+
  '<div class="panel resident-news"><div><small>Comunicado recente</small><b>'+(news?esc(news.titulo):'Nenhum comunicado novo')+'</b><p>'+(news?esc(news.texto):'Os avisos do condomínio aparecerão aqui.')+'</p></div><button class="btn ghost sm" type="button" data-nav="comunicacao">Ver avisos</button></div>';
}

function render(){
  if(!supabase){renderAuth();return}
  if(!DB_READY){renderAuth();return}
  document.body.classList.toggle('unit-modal-open',!!activeUnitId);
  if(RECOVERY){renderRecovery('');return}
  var a=document.activeElement, id=a&&a.id, selS=null, selE=null;
  if(id&&id.indexOf('q-')===0&&a.selectionStart!=null){selS=a.selectionStart;selE=a.selectionEnd}
  setShell(true);
  document.getElementById('app').classList.toggle('resident-app',role==='morador');
  document.getElementById('app').innerHTML=shell();
  if(id==='mes'||(id&&id.indexOf('q-')===0)){var el=document.getElementById(id);if(el){el.focus();if(selS!=null&&el.setSelectionRange){try{el.setSelectionRange(selS,selE)}catch(x){}}}}
}

function openUnitModal(id){activeUnitId=id;editingTenant=false;render();var close=document.querySelector('[data-unit-modal-close]');if(close)close.focus()}
function closeUnitModal(){var id=activeUnitId;activeUnitId='';editingTenant=false;render();var card=Array.from(document.querySelectorAll('[data-open-unit]')).find(function(el){return el.dataset.openUnit===id});if(card)card.focus()}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&activeUnitId){e.preventDefault();closeUnitModal();return}var card=e.target.closest('[data-open-unit][role="button"]');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openUnitModal(card.dataset.openUnit)}});
document.addEventListener('input',function(e){var t=e.target;if(t.id==='q-fin'){finQ=t.value;render()}else if(t.id==='q-unit'){unitQ=t.value;render()}});
document.addEventListener('change',function(e){
  if(e.target.id==='q-fin-st'){finSt=e.target.value;render()}
  if(e.target.id==='mes'){setMes(e.target.value);render()}
  if(e.target.id==='my-unit'&&role!=='morador'){MY=e.target.value;render()}
  if(e.target.id==='c-alu-fin'){S.config.cobrarAluguel=e.target.value==='sim';save();render()}
  if(e.target.name==='payment-mode'){document.querySelectorAll('[data-payment-section]').forEach(function(el){el.hidden=el.dataset.paymentSection!==e.target.value})}
});
document.addEventListener('click',async function(e){
  if(e.target.matches('[data-unit-modal-backdrop]')){closeUnitModal();return}
  if(e.target.closest('[data-open-payment-options]')){var payPanel=document.getElementById('resident-payment-options');if(payPanel)payPanel.scrollIntoView({behavior:'smooth',block:'center'});return}
  var financeTabButton=e.target.closest('[data-ftab]');if(financeTabButton){financeTab=financeTabButton.dataset.ftab;render();return}
  var unitTabButton=e.target.closest('[data-unit-tab]');if(unitTabButton){unitTab=unitTabButton.dataset.unitTab;render();return}
  var blockTabButton=e.target.closest('[data-block-tab]');if(blockTabButton){activeBlock=blockTabButton.dataset.blockTab;render();return}
  var openUnit=e.target.closest('[data-open-unit]');if(openUnit){openUnitModal(openUnit.dataset.openUnit);return}
  if(e.target.closest('[data-close-unit]')){closeUnitModal();return}
  if(e.target.closest('[data-edit-tenant]')){editingTenant=true;render();var firstTenantField=document.getElementById('n-nomes');if(firstTenantField)firstTenantField.focus();return}
  if(e.target.closest('[data-cancel-edit]')){editingTenant=false;render();return}
  var vacate=e.target.closest('[data-vacate]');if(vacate){
    var leaving=S.unidades.find(function(u){return u.id===vacate.dataset.vacate});if(!leaving||leaving.situacao!=='Inquilino')return;
    if(!window.confirm('Registrar a saída do(s) inquilino(s) de '+uLabel(leaving)+'? O apartamento e os dados do bloco serão mantidos.'))return;
    var linked=await supabase.from('moradores').select('id,user_id').eq('condominio_id',CONDO_ID).eq('unidade_id',leaving.id).eq('tipo','inquilino');
    if(linked.error){flash('Não foi possível verificar os acessos dos moradores: '+linked.error.message);return}
    for(var linkedResident of linked.data||[]){if(linkedResident.user_id){var revokeResult=await supabase.rpc('revogar_acesso',{_user_id:linkedResident.user_id});if(revokeResult.error){flash('Não foi possível revogar o acesso do morador: '+revokeResult.error.message);return}}}
    var deleted=await supabase.from('moradores').delete().eq('condominio_id',CONDO_ID).eq('unidade_id',leaving.id).eq('tipo','inquilino');if(deleted.error){flash('Não foi possível registrar a desocupação: '+deleted.error.message);return}
    leaving.morador='—';leaving.tel='—';leaving.situacao='Vago';leaving.aluguel=0;leaving.residentIds=[];leaving.residentEmails=[];leaving.residentUsers=[];leaving.contractPath='';leaving.contractName='';leaving.contractStart=null;leaving.contractEnd=null;leaving.pago={};activeUnitId=leaving.id;editingTenant=false;save();await saveQueue;toast('Unidade '+uLabel(leaving)+' marcada como vaga e acessos revogados');return
  }
  if(e.target.closest('[data-forgot]')){
    var forgotEmail=((document.getElementById('a-email')||{}).value||'').trim();
    if(!forgotEmail){authNotice='Digite seu e-mail no campo abaixo e clique em "Esqueci minha senha" de novo.';renderAuth();return}
    authEmail=forgotEmail;
    var resetResult=await supabase.auth.resetPasswordForEmail(forgotEmail,{redirectTo:location.origin+location.pathname});
    authNotice=resetResult.error?'Não foi possível enviar o e-mail: '+resetResult.error.message:'Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha.';
    renderAuth();return
  }
  var authButton=e.target.closest('[data-auth-mode]');
  if(authButton){authMode=authMode==='register'?'login':'register';authNotice='';renderAuth();return}
  if(e.target.closest('[data-signout]')){if(portariaCheckTimer)clearInterval(portariaCheckTimer);DB_READY=false;USER=null;CONDO_ID='';supabase.auth.signOut().then(function(){renderAuth()});return}
  var removePortaria=e.target.closest('[data-portaria-remove]');if(removePortaria){if(!window.confirm('Remover o acesso deste profissional à portaria?'))return;var removedPortaria=await supabase.functions.invoke('portaria-equipe',{body:{action:'remove',userId:removePortaria.dataset.portariaRemove}});if(removedPortaria.error){flash('Não foi possível remover o acesso: '+removedPortaria.error.message);return}await refreshPortariaConfig();render();flash('Acesso removido');return}
  var aw=e.target.closest('a[data-aviso]');
  if(aw){var pk=S.encomendas.filter(function(x){return x.id===aw.dataset.aviso})[0];if(pk){pk.avisado=now();save();setTimeout(render,80)}return}
  var t=e.target.closest('button');if(!t)return;
  var d=t.dataset, f;
  if(d.generateBills){renderLoading('Gerando cobranças do mês…');var generated=await supabase.rpc('gerar_cobrancas_condominio',{_competencia:MES+'-01'});if(generated.error){flash('Falha ao gerar cobranças: '+generated.error.message);render();return}await loadWorkspace({user:USER});flash('Cobranças do mês recalculadas e salvas');return}
  if(d.contract){var signed=await supabase.storage.from('contratos-locacao').createSignedUrl(d.contract,60);if(signed.error){flash('Não foi possível abrir o contrato: '+signed.error.message);return}window.open(signed.data.signedUrl,'_blank','noopener');return}
  if(d.exportCob){exportCobrancas();return}
  if(d.exportDesp){exportDespesas();return}
  if(d.printReport){printReport();return}
  if(d.themeToggle){THEME=THEME==='auto'?'dark':THEME==='dark'?'light':'auto';try{localStorage.setItem('condogestor-theme',THEME)}catch(x){}applyTheme();render();return}
  if(d.nav){if(d.ftabSet)financeTab=d.ftabSet;view=d.nav;render();return}
  if(d.pay){f=S.unidades.filter(function(u){return u.id===d.pay})[0];f.pago[MES]=true;save();await saveQueue;var paidResult=await Promise.all([supabase.from('cobrancas_unidade').update({status:'pago'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01'),supabase.from('cobrancas_taxas_adicionais').update({status:'pago'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01')]);var paidError=paidResult.find(function(x){return x.error});if(paidError){flash('Não foi possível confirmar a baixa: '+paidError.error.message);return}toast('Pagamento registrado para '+uLabel(f));return}
  if(d.unpay){f=S.unidades.filter(function(u){return u.id===d.unpay})[0];if(!window.confirm('Estornar o pagamento de '+uLabel(f)+'?'))return;delete f.pago[MES];save();await saveQueue;var unpayResult=await Promise.all([supabase.from('cobrancas_unidade').update({status:'pendente'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01'),supabase.from('cobrancas_taxas_adicionais').update({status:'pendente'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01')]);var unpayError=unpayResult.find(function(x){return x.error});if(unpayError){flash('Não foi possível estornar: '+unpayError.error.message);return}toast('Pagamento estornado');return}
  if(d.copy){f=S.unidades.filter(function(u){return u.id===d.copy})[0];
    var txt=cobrancaTexto(f);
    try{navigator.clipboard.writeText(txt).then(function(){toast('Mensagem de cobrança copiada')},function(){toast(txt)})}catch(x){toast(txt)}return}
  if(d.delUnit){var removed=S.unidades.find(function(u){return u.id===d.delUnit});var removedLabel=removed?uLabel(removed):'';if(!window.confirm('Remover o apartamento '+removedLabel+'?\n\nIsso apaga também moradores, cobranças e o histórico desta unidade, e revoga os acessos. A ação não pode ser desfeita.'))return;var linkedToDelete=await supabase.from('moradores').select('user_id').eq('condominio_id',CONDO_ID).eq('unidade_id',d.delUnit).eq('tipo','inquilino');if(linkedToDelete.error){flash('Não foi possível verificar os acessos dos moradores: '+linkedToDelete.error.message);return}for(var linkedRow of linkedToDelete.data||[]){if(linkedRow.user_id){var revokeDelete=await supabase.rpc('revogar_acesso',{_user_id:linkedRow.user_id});if(revokeDelete.error){flash('Não foi possível revogar o acesso do morador: '+revokeDelete.error.message);return}}}var delUnit=await supabase.from('unidades').delete().eq('condominio_id',CONDO_ID).eq('id',d.delUnit);if(delUnit.error){flash('Não foi possível remover a unidade: '+delUnit.error.message);return}S.unidades=S.unidades.filter(function(u){return u.id!==d.delUnit});S.prestadores=S.prestadores.filter(function(x){return x.unidade!==removedLabel});S.veiculos=S.veiculos.filter(function(x){return x.unidade!==removedLabel});S.visitantes=S.visitantes.filter(function(x){return x.unidade!==removedLabel});S.encomendas=S.encomendas.filter(function(x){return x.unidade!==removedLabel});S.chamados=S.chamados.filter(function(x){return x.unidade!==removedLabel});save();toast('Unidade removida e acessos revogados');return}
  if(d.delDesp){if(!window.confirm('Excluir esta despesa?'))return;var dd=await supabase.from('despesas_condominio').delete().eq('condominio_id',CONDO_ID).eq('id',d.delDesp);if(dd.error){flash(dd.error.message);return}S.despesas=S.despesas.filter(function(x){return x.id!==d.delDesp});save();toast('Despesa excluída');return}
  if(d.delNot){if(!window.confirm('Excluir este comunicado?'))return;var dn=await supabase.from('comunicados').delete().eq('condominio_id',CONDO_ID).eq('id',d.delNot);if(dn.error){flash(dn.error.message);return}S.comunicados=S.comunicados.filter(function(x){return x.id!==d.delNot});save();toast('Comunicado excluído');return}
  if(d.ltab){leitTab=d.ltab;render();return}
  if(d.ptab){portTab=d.ptab;render();return}
  if(d.pout){f=S.prestadores.filter(function(x){return x.id===d.pout})[0];f.saida=now();save();toast('Saída do prestador registrada');return}
  if(d.vout){f=S.veiculos.filter(function(x){return x.id===d.vout})[0];f.saida=now();save();toast('Saída do veículo registrada');return}
  if(d.delVei){if(!window.confirm('Remover este veículo?'))return;var dv=await supabase.from('veiculos_condominio').delete().eq('condominio_id',CONDO_ID).eq('id',d.delVei);if(dv.error){flash(dv.error.message);return}S.veiculos=S.veiculos.filter(function(x){return x.id!==d.delVei});save();toast('Veículo removido');return}
  if(d.pagOk){f=S.pagamentos.filter(function(x){return x.id===d.pagOk})[0];if(!f)return;
    var okPay=await supabase.from('pagamentos_morador').update({status:'confirmado',conferido_por:USER.id,conferido_em:new Date().toISOString()}).eq('condominio_id',CONDO_ID).eq('id',f.id);
    if(okPay.error){flash('Não foi possível confirmar o pagamento: '+okPay.error.message);return}
    var okBills=await Promise.all([supabase.from('cobrancas_unidade').update({status:'pago'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.unidadeId).eq('competencia',f.mes+'-01'),supabase.from('cobrancas_taxas_adicionais').update({status:'pago'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.unidadeId).eq('competencia',f.mes+'-01')]);
    var okBillErr=okBills.find(function(x){return x.error});if(okBillErr)flash('Pagamento confirmado, mas a baixa da fatura falhou: '+okBillErr.error.message);
    var un=S.unidades.filter(function(x){return x.id===f.unidadeId})[0];if(un)un.pago[f.mes]=true;f.status='Confirmado';toast('Pagamento confirmado e fatura baixada');return}
  if(d.pagNo){f=S.pagamentos.filter(function(x){return x.id===d.pagNo})[0];if(!f)return;if(!window.confirm('Recusar este pagamento informado pelo morador?'))return;
    var noPay=await supabase.from('pagamentos_morador').update({status:'recusado',conferido_por:USER.id,conferido_em:new Date().toISOString()}).eq('condominio_id',CONDO_ID).eq('id',f.id);
    if(noPay.error){flash('Não foi possível recusar o pagamento: '+noPay.error.message);return}
    f.status='Recusado';toast('Pagamento recusado');return}
  if(d.copyKey){f=S.meios.filter(function(x){return x.id===d.copyKey})[0];var k=(f.dados&&f.dados.chave)||'';try{navigator.clipboard.writeText(k).then(function(){flash('Chave PIX copiada')},function(){flash(k)})}catch(x){flash(k)}return}
  if(d.informar){f=S.meios.filter(function(x){return x.id===d.informar})[0];await registrarPag(f,'Aguardando conferência');if(role==='morador')toast('Pagamento informado. Aguarde a confirmação do síndico');return}
  if(d.mp){flash('A integração real com o Mercado Pago ainda não está conectada. Nenhum pagamento foi processado.');return}
  if(d.endTaxa){f=S.taxas.filter(function(x){return x.id===d.endTaxa})[0];f.fim=MES;save();toast('Taxa encerrada após '+MES_LABEL);return}
  if(d.delTaxa){if(!window.confirm('Excluir esta taxa adicional?'))return;var dt=await supabase.from('taxas_adicionais').delete().eq('condominio_id',CONDO_ID).eq('id',d.delTaxa);if(dt.error){flash('A taxa não pode ser removida enquanto houver cobranças vinculadas: '+dt.error.message);return}S.taxas=S.taxas.filter(function(x){return x.id!==d.delTaxa});save();toast('Taxa excluída');return}
  if(d.out){f=S.visitantes.filter(function(x){return x.id===d.out})[0];f.saida=now();save();toast('Saída registrada');return}
  if(d.pick){f=S.encomendas.filter(function(x){return x.id===d.pick})[0];f.retirada=now();save();toast('Encomenda entregue');return}
  if(d.next){f=S.chamados.filter(function(x){return x.id===d.next})[0];f.status=f.status==='Aberto'?'Em andamento':'Resolvido';save();toast('Chamado atualizado');return}
});
document.addEventListener('submit',async function(e){
  e.preventDefault();var id=e.target.id, v=function(i){var field=document.getElementById(i);return field?field.value.trim():''};
  if(id==='f-resident-password'){
    var newPassword=v('resident-new-password'),confirmPassword=v('resident-confirm-password'),token=pendingInviteToken||inviteTokenFromUrl();
    if(newPassword.length<8){renderResidentPassword('A senha deve ter pelo menos 8 caracteres.');return}
    if(newPassword!==confirmPassword){renderResidentPassword('As senhas não são iguais.');return}
    if(!token){renderAuth();authNotice='Convite não encontrado. Peça ao síndico para enviar um novo acesso.';renderAuth();return}
    renderLoading('Ativando seu acesso…');
    try{
      var updated=await supabase.auth.updateUser({password:newPassword});if(updated.error)throw updated.error;
      var accepted=await supabase.rpc('aceitar_convite',{_token:token});if(accepted.error)throw accepted.error;
      await supabase.auth.updateUser({data:{sercon_convite_token:null}});clearInviteTokenFromUrl();pendingInviteToken='';
      var active=await supabase.auth.getSession();if(active.error)throw active.error;await loadWorkspace(active.data.session);
    }catch(err){renderResidentPassword(err.message||'Não foi possível ativar o acesso.')}
    return;
  }
  if(id==='f-recovery'){
    var rp=v('recovery-new-password'),rc=v('recovery-confirm-password');
    if(rp.length<8){renderRecovery('A senha deve ter pelo menos 8 caracteres.');return}
    if(rp!==rc){renderRecovery('As senhas não são iguais.');return}
    renderLoading('Salvando nova senha…');
    try{
      var upd=await supabase.auth.updateUser({password:rp});if(upd.error)throw upd.error;
      RECOVERY=false;history.replaceState({},'',location.pathname+location.search);
      var sess=await supabase.auth.getSession();if(sess.error||!sess.data.session)throw (sess.error||new Error('Sessão não encontrada. Peça um novo link.'));
      await enterWorkspace(sess.data.session);
    }catch(err){renderRecovery(err.message||'Não foi possível salvar a nova senha.')}
    return;
  }
  if(id==='f-auth'){
    var email=v('a-email'),password=v('a-password'),registering=authMode==='register';
    var meta=registering?{nome:v('a-nome'),condominio_nome:v('a-cond'),condominio_cnpj:v('a-cnpj'),condominio_endereco:v('a-endereco'),condominio_telefone:v('a-telefone'),condominio_email:email,taxa_condominio:Number(v('a-taxa')),vencimento_dia:Number(v('a-venc')),agua_modo:v('a-agua'),valor_m3_agua:Number(v('a-agua-tarifa')),valor_m3_gas:Number(v('a-gas')),criterio_rateio_agua:'fracao_ideal'}:null;
    authNotice='';renderLoading('Validando acesso…');
    (async function(){try{
      if(registering){
        var created=await supabase.auth.signUp({email:email,password:password,options:{data:meta}});if(created.error)throw created.error;
        if(!created.data.session){authNotice='Cadastro criado. Confirme o e-mail e depois entre para acessar o condomínio.';authMode='login';renderAuth();return}
        await enterWorkspace(created.data.session);
      }else{
        var logged=await supabase.auth.signInWithPassword({email:email,password:password});if(logged.error)throw logged.error;
        await enterWorkspace(logged.data.session);
      }
    }catch(err){DB_READY=false;USER=null;authNotice=err.message||'Não foi possível acessar o sistema.';renderAuth()}})();return;
  }
  if(id==='f-portaria-settings'){
    var configResult=await supabase.functions.invoke('portaria-equipe',{body:{action:'set-enabled',enabled:document.getElementById('portaria-enabled').checked}});
    if(configResult.error){flash('Não foi possível salvar: '+configResult.error.message);return}
    await refreshPortariaConfig();if(!PORTARIA_CONFIG.habilitada&&view==='portaria')view='equipe_portaria';render();flash(PORTARIA_CONFIG.habilitada?'Módulo Portaria habilitado':'Módulo Portaria desabilitado');return;
  }
  if(id==='f-portaria-staff'){
    var inviteName=v('staff-nome'),inviteEmail=v('staff-email');
    var inviteResult=await supabase.functions.invoke('portaria-equipe',{body:{action:'invite',nome:inviteName,email:inviteEmail}});
    if(inviteResult.error){flash('Não foi possível enviar o convite: '+inviteResult.error.message);return}
    await refreshPortariaConfig();render();flash(inviteResult.data&&inviteResult.data.inviteSent?'Convite enviado para '+inviteEmail:'Acesso liberado para '+inviteEmail);return;
  }
  if(id==='f-payment-config'){
    var modeField=e.target.querySelector('[name="payment-mode"]:checked');
    if(!modeField){flash('Escolha Pix manual ou Mercado Pago.');return}
    var config={action:'save',mode:modeField.value};
    if(config.mode==='pix'){
      config.pixKeyType=v('p-tipochave');config.pixKey=v('p-chave');config.beneficiary=v('p-fav');config.instructions=v('p-instr-pix');
      if(!config.pixKey){flash('Informe a chave Pix do condomínio.');return}
    }else{
      config.publicKey=v('p-mppk');config.accessToken=document.getElementById('p-mptoken').value.trim();
      config.pix=document.getElementById('p-mp-pix').checked;config.cartao=document.getElementById('p-mp-cartao').checked;config.boleto=document.getElementById('p-mp-boleto').checked;
      if(!config.publicKey){flash('Informe a Public Key da aplicação Mercado Pago.');return}
      if(!MP_CONFIG.mercadoPago.hasAccessToken&&!config.accessToken){flash('Informe o Access Token do Mercado Pago.');return}
      if(!config.pix&&!config.cartao&&!config.boleto){flash('Ative ao menos uma forma de pagamento.');return}
    }
    var saved=await supabase.functions.invoke('payment-config',{body:config});
    if(saved.error||saved.data&&saved.data.error){flash(saved.data&&saved.data.error||'Não foi possível salvar. Confira se aplicou a migração e publicou a Edge Function.');return}
    await refreshPaymentConfig();render();toast('Forma de pagamento salva');return;
  }
  if(e.target.matches('[data-resident-access-form]')){
    var accessUnit=S.unidades.find(function(u){return u.id===e.target.dataset.unitId}),residentId=e.target.dataset.residentId;
    if(!accessUnit||accessUnit.situacao!=='Inquilino'){flash('Cadastre primeiro a locação deste apartamento.');return}
    accessUnit.residentEmails=accessUnit.residentEmails||[];accessUnit.residentUsers=accessUnit.residentUsers||[];
    var residentIndex=(accessUnit.residentIds||[]).indexOf(residentId),accessEmail=e.target.querySelector('[name="email"]').value.trim().toLowerCase();
    if(residentIndex<0){flash('Não foi possível localizar o morador neste apartamento.');return}
    if((accessUnit.residentUsers||[])[residentIndex]){flash('Este morador já tem acesso ativo ao aplicativo.');return}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accessEmail)){flash('Informe um e-mail válido para o acesso.');return}
    var residentCheck=await supabase.from('moradores').select('id').eq('condominio_id',CONDO_ID).eq('unidade_id',accessUnit.id).eq('id',residentId).maybeSingle();
    if(residentCheck.error||!residentCheck.data){render();flash('Este morador ainda não foi gravado no banco. Salve a locação antes de enviar o convite.');return}
    var emailSaved=await supabase.from('moradores').update({email:accessEmail}).eq('condominio_id',CONDO_ID).eq('unidade_id',accessUnit.id).eq('id',residentId);
    if(emailSaved.error){render();flash('Não foi possível salvar o e-mail do morador: '+emailSaved.error.message);return}
    accessUnit.residentEmails[residentIndex]=accessEmail;renderLoading('Enviando o convite de acesso…');
    var accessInvite=await supabase.functions.invoke('morador-acesso',{body:{action:'invite',moradorId:residentId}});
    if(accessInvite.error||accessInvite.data&&accessInvite.data.error){render();flash('E-mail salvo, mas o convite não foi enviado: '+(accessInvite.data&&accessInvite.data.error||accessInvite.error.message));return}
    if(accessInvite.data&&accessInvite.data.requiresExistingLogin&&accessInvite.data.token){RESIDENT_INVITES[residentId]=true;var inviteUrl=new URL(location.href);inviteUrl.searchParams.set('convite',accessInvite.data.token);inviteUrl.hash='';try{await navigator.clipboard.writeText(inviteUrl.toString());render();flash('Este e-mail já tem conta. Link para vincular o apartamento copiado; envie-o ao morador.')}catch(copyError){render();window.prompt('Copie e envie este link ao morador:',inviteUrl.toString())}return}
    RESIDENT_INVITES[residentId]=true;render();toast('Convite de acesso enviado para '+accessEmail);return;
  }
  if(id==='f-tenant'){
    var unit=S.unidades.find(function(u){return u.id===e.target.dataset.unitId}),isEditing=!!(unit&&editingTenant);
    if(!unit||(unit.situacao!=='Vago'&&!isEditing)){flash('Esta unidade não está disponível para nova locação');return}
    var names=splitNames(v('n-nomes')),phones=splitPhones(v('n-telefones')),file=document.getElementById('n-contrato').files[0];
    if(!names.length){flash('Informe ao menos um inquilino');return}
    var oldIds=unit.residentIds||[],oldEmails=unit.residentEmails||[],oldUsers=unit.residentUsers||[];
    var contractPath=isEditing?(unit.contractPath||''):'';
    if(file){if(file.size>10*1024*1024){flash('O contrato deve ter no máximo 10 MB');return}var path=CONDO_ID+'/'+unit.id+'/locacao-'+uid()+'/'+safeName(file.name),uploaded=await supabase.storage.from('contratos-locacao').upload(path,file,{upsert:false,contentType:file.type});if(uploaded.error){flash('Falha ao anexar contrato: '+uploaded.error.message);return}contractPath=uploaded.data.path}
    for(var j=names.length;j<oldIds.length;j++){
      if(oldUsers[j]){var revoked=await supabase.rpc('revogar_acesso',{_user_id:oldUsers[j]});if(revoked.error){flash('Não foi possível revogar o acesso de '+(splitNames(unit.morador)[j]||'um morador')+': '+revoked.error.message);return}}
      var removed=await supabase.from('moradores').delete().eq('condominio_id',CONDO_ID).eq('id',oldIds[j]);if(removed.error){flash('Não foi possível remover o cadastro do morador: '+removed.error.message);return}
    }
    unit.morador=names.join(', ');unit.residentPhones=names.map(function(_,i){return phones[i]||''});unit.tel=unit.residentPhones.find(function(phone){return phone})||'—';unit.situacao='Inquilino';unit.aluguel=parseFloat(v('n-aluguel'))||0;
    unit.residentIds=names.map(function(_,i){return oldIds[i]||uid()});unit.residentEmails=names.map(function(_,i){return oldEmails[i]||''});unit.residentUsers=names.map(function(_,i){return oldUsers[i]||''});
    unit.contractPath=contractPath;unit.contractName=file?file.name:(isEditing?unit.contractName:'');unit.contractStart=v('n-inicio')||null;unit.contractEnd=v('n-fim')||null;
    editingTenant=false;try{await saveQueue;await persistWorkspace()}catch(persistError){flash('Não foi possível salvar os dados do inquilino: '+(persistError.message||persistError));return}render();
    toast('Locação salva. O acesso ao aplicativo pode ser cadastrado na seção separada abaixo.');return
  }
  if(id==='f-unit'){var dono=v('u-dono'),situacao=v('u-sit'),morador=v('u-morador')||(situacao==='Proprietário residente'?dono:''),phones=splitPhones(v('u-telefones'));var residentPhones=situacao==='Inquilino'?splitNames(morador).map(function(_,i){return phones[i]||''}):[];if(situacao==='Inquilino'&&!morador){flash('Informe ao menos um inquilino');return}var vagas=Array.from(new Set(v('u-vagas').split(',').map(function(x){return x.trim()}).filter(Boolean))),unitId=uid(),file=document.getElementById('u-contrato').files[0],contractPath='';if(file){if(file.size>10*1024*1024){flash('O contrato deve ter no máximo 10 MB');return}var uploaded=await supabase.storage.from('contratos-locacao').upload(CONDO_ID+'/'+unitId+'/'+safeName(file.name),file,{upsert:true,contentType:file.type});if(uploaded.error){flash('Falha ao anexar contrato: '+uploaded.error.message);return}contractPath=uploaded.data.path}S.unidades.push({id:unitId,bloco:v('u-bloco').toUpperCase(),apto:v('u-apto'),dono:dono,morador:morador||'—',tel:residentPhones.find(function(phone){return phone})||v('u-tel')||'—',residentPhones:residentPhones,situacao:situacao,taxa:S.config.taxaCondominio,aluguel:parseFloat(v('u-alu'))||0,leituras:{},pago:{},contractPath:contractPath,contractName:file&&file.name,contractStart:v('u-inicio')||null,contractEnd:v('u-fim')||null,gasMeter:v('u-gas')||'',waterMeter:v('u-agua')||'',parkingSpaces:vagas});renderLoading('Salvando unidade e moradores…');try{await saveQueue;await persistWorkspace()}catch(unitSaveError){render();flash('Não foi possível salvar a unidade e os moradores: '+(unitSaveError.message||unitSaveError));return}unitTab='apartamentos';activeBlock=v('u-bloco').toUpperCase();view='unidades';render();toast('Unidade cadastrada')}
  else if(id==='f-config'){S.config.taxaCondominio=parseFloat(v('cfg-taxa'))||0;S.config.vencimentoDia=parseInt(v('cfg-venc'),10)||10;S.unidades.forEach(function(u){u.taxa=S.config.taxaCondominio});save();toast('Taxa padrão salva e cobranças atualizadas')}
  else if(id==='f-agua'){var bad=saveReads('agua','aa-','ab-');if(bad){flash('A leitura atual da unidade '+bad+' não pode ser menor que a leitura anterior');return}S.config.contaMes[MES]=parseFloat(v('c-agua'))||0;S.config.tarifaAgua=parseFloat(v('c-agua-tarifa'))||0;S.config.modoAgua=v('c-modo');save();toast('Água salva e cobrança recalculada')}
  else if(id==='f-gas'){var bad2=saveReads('gas','ga-','gb-');if(bad2){flash('A leitura atual da unidade '+bad2+' não pode ser menor que a leitura anterior');return}S.config.tarifaMes[MES]=parseFloat(v('c-gas'))||0;save();toast('Gás salvo e cobrança recalculada')}
  else if(id==='f-prest'){S.prestadores.push({id:uid(),nome:v('s-nome'),empresa:v('s-emp')||'—',servico:v('s-serv'),doc:v('s-doc')||'—',unidade:v('s-un'),autorizado:v('s-aut')||'—',entrada:now(),saida:''});save();toast('Entrada do prestador registrada')}
  else if(id==='f-vei'){var pl=v('w-placa').toUpperCase().replace(/\s/g,'');
    if(!/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/.test(pl)){flash('Placa inválida. Use ABC-1D23 ou ABC-1234');return}
    pl=pl.replace('-','');pl=pl.slice(0,3)+'-'+pl.slice(3);var tp2=v('w-tipo');
    S.veiculos.push({id:uid(),placa:pl,modelo:v('w-modelo'),cor:v('w-cor'),tipo:tp2,unidade:v('w-un'),vaga:v('w-vaga')||'—',entrada:tp2==='Morador'?'':now(),saida:''});save();toast('Veículo registrado')}
  else if(id==='f-taxa'){
    var ap=v('t-aplica'),ini=v('t-ini'),fim=v('t-fim');
    var sel=S.unidades.filter(function(u){return document.getElementById('tu-'+u.id).checked}).map(function(u){return u.id});
    if(ap==='selecionadas'&&!sel.length){flash('Marque ao menos um apartamento');return}
    if(fim&&fim<ini){flash('A data final precisa ser igual ou posterior à inicial');return}
    S.taxas.push({id:uid(),nome:v('t-nome'),valor:parseFloat(v('t-valor'))||0,modo:v('t-modo'),aplica:ap,unidades:ap==='selecionadas'?sel:[],inicio:ini,fim:fim});save();toast('Taxa cadastrada')}
  else if(id==='f-desp'){S.despesas.push({id:uid(),desc:v('d-desc'),cat:v('d-cat'),valor:parseFloat(v('d-valor')),data:v('d-data')});save();toast('Despesa lançada')}
  else if(id==='f-vis'){S.visitantes.push({id:uid(),nome:v('v-nome'),doc:v('v-doc')||'—',unidade:v('v-un'),entrada:now(),saida:''});save();toast('Entrada registrada')}
  else if(id==='f-enc'){S.encomendas.push({id:uid(),unidade:v('e-un'),transp:v('e-tr'),chegada:now(),retirada:''});save();toast('Encomenda registrada')}
  else if(id==='f-not'){S.comunicados.push({id:uid(),titulo:v('n-tit'),texto:v('n-txt'),data:now().slice(0,10)});save();toast('Comunicado publicado')}
  else if(id==='f-ch'){var un=role==='morador'?MY:v('c-un');if(role==='morador'){var ticket=await supabase.from('chamados').insert({condominio_id:CONDO_ID,unidade_id:S.unidades[0].id,titulo:v('c-tit'),descricao:v('c-tit'),categoria:'outros',prioridade:'media',status:'aberto',aberto_por:USER.id}).select().single();if(ticket.error){flash('Não foi possível abrir o chamado: '+ticket.error.message);return}S.chamados.unshift({id:ticket.data.id,unidade:un,titulo:ticket.data.titulo,status:'Aberto',data:(ticket.data.criado_em||'').slice(0,10)});render();toast('Chamado aberto')}else{S.chamados.push({id:uid(),unidade:un,titulo:v('c-tit'),status:'Aberto',data:now().slice(0,10)});save();toast('Chamado aberto')}}
});
applyTheme();
render();
if(supabase){
  supabase.auth.getSession().then(function(result){
    if(result.error){authNotice=result.error.message;renderAuth();return}
    if(RECOVERY){renderRecovery('');return}
    if(result.data.session){renderLoading('Carregando dados do condomínio…');enterWorkspace(result.data.session).catch(function(err){DB_READY=false;USER=null;authNotice=err.message||'Falha ao carregar o condomínio.';renderAuth()})}
    else{if(inviteTokenFromUrl())authNotice='Entre com o mesmo e-mail que recebeu o convite para ativar o acesso.';renderAuth()}
  });
  supabase.auth.onAuthStateChange(function(event){
    if(event==='PASSWORD_RECOVERY'){RECOVERY=true;renderRecovery('');return}
    if(event==='SIGNED_OUT'){DB_READY=false;USER=null;CONDO_ID='';renderAuth()}
  });
}
})();
