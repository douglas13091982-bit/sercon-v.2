import { createClient } from "@supabase/supabase-js";

(function(){
var MES=new Date().toISOString().slice(0,7), MES_LABEL='', COND='', CONDO_ID='', USER=null, DB_READY=false, DEMO=false, BLOCK_IDS={};
var supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
var supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
var supabase=(supabaseUrl&&supabaseKey)?createClient(supabaseUrl,supabaseKey):null;
var brl=function(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uid=function(){return crypto.randomUUID()};
var now=function(){var d=new Date();return d.toISOString().slice(0,16)};
var fmtDT=function(s){if(!s)return '';var d=new Date(s);return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
var fmtD=function(s){var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]};

function seed(){return {config:{tarifaGas:0,tarifaAgua:0,taxaCondominio:0,vencimentoDia:10,contaAgua:0,modoAgua:'consumo',cobrarAluguel:false,contaMes:{},tarifaMes:{}},prestadores:[],veiculos:[],meios:[],pagamentos:[],taxas:[],unidades:[],historico:[],despesas:[],visitantes:[],encomendas:[],comunicados:[],chamados:[]}}
function loadDemo(){
  DEMO=true;DB_READY=true;role='sindico';view='dashboard';COND='Residencial Jardim das Flores';CONDO_ID='demo';USER={email:'demonstração'};setMes(MES);S=seed();
  S.config={tarifaGas:7.5,tarifaAgua:0,taxaCondominio:320,vencimentoDia:10,contaAgua:780,modoAgua:'consumo',cobrarAluguel:false,contaMes:{},tarifaMes:{}};S.config.contaMes[MES]=780;S.config.tarifaMes[MES]=7.5;
  var unit=function(id,bloco,apto,dono,morador,tel,situacao,aluguel,gas,agua,pago){var u={id:id,bloco:bloco,apto:apto,dono:dono,morador:morador,tel:tel,situacao:situacao,taxa:320,aluguel:aluguel,leituras:{},pago:{},gasMeter:'G-'+apto,waterMeter:'A-'+apto};u.leituras[MES]={gas:[gas-5,gas],agua:[agua-4,agua]};if(pago)u.pago[MES]=true;return u};
  S.unidades=[unit('demo-a101','A','101','Marcos Silva','João e Ana Lima','(47) 99911-2233','Inquilino',1600,42,36,true),unit('demo-a102','A','102','Carla Souza','Carla Souza','(47) 99922-3344','Proprietário residente',0,31,28,true),unit('demo-a103','A','103','Paulo Mendes','—','(47) 99933-4455','Vago',0,0,0,false),unit('demo-b201','B','201','Renata Costa','Renata Costa','(47) 99944-5566','Proprietário residente',0,28,23,false),unit('demo-b202','B','202','Luiz Ferreira','Pedro Alves','(47) 99955-6677','Inquilino',1350,37,31,false),unit('demo-c301','C','301','Fernanda Rocha','Fernanda Rocha','(47) 99966-7788','Proprietário residente',0,34,26,true)];
  S.taxas=[{id:'demo-taxa-1',nome:'Fundo de reserva',valor:90,modo:'rateio',aplica:'ocupadas',unidades:[],inicio:MES,fim:''}];
  S.despesas=[{id:'demo-d1',desc:'Manutenção do elevador',cat:'Manutenção',valor:680,data:MES+'-05',fornecedor:'Elevatec'},{id:'demo-d2',desc:'Limpeza das áreas comuns',cat:'Serviços',valor:420,data:MES+'-11',fornecedor:'Equipe Limpa'}];
  S.visitantes=[{id:'demo-v1',nome:'Roberto Almeida',doc:'***.***.***-12',unidade:'A-101',entrada:now(),saida:''}];S.encomendas=[{id:'demo-e1',unidade:'B-202',transp:'Correios',chegada:now(),retirada:'',avisado:''}];
  S.chamados=[{id:'demo-c1',unidade:'A-102',titulo:'Lâmpada queimada no corredor',status:'Aberto',data:MES+'-09'},{id:'demo-c2',unidade:'B-202',titulo:'Verificar vazamento na cozinha',status:'Em andamento',data:MES+'-12'}];S.comunicados=[{id:'demo-n1',titulo:'Limpeza da caixa d’água',texto:'A limpeza será realizada na próxima terça-feira, das 9h às 12h.',data:MES+'-02'}];
  S.meios=[{id:'demo-m1',nome:'PIX do condomínio',tipo:'pix',ativo:true,dados:{chave:'financeiro@jardimdasflores.com.br',favorecido:'Residencial Jardim das Flores'},instrucoes:'Informe o pagamento para conferência.'}];S.pagamentos=[{id:'demo-p1',unidadeId:'demo-b202',unidade:'B-202',mes:MES,valor:410,meio:'PIX',data:now(),status:'Aguardando conferência'}];S.historico=[['Mai',2800,1050],['Jun',3120,980],['Jul',2950,1210],['Ago',3280,920],['Set',3050,1140],['Out',3260,1100]];render();
}
var S=seed();
var saveQueue=Promise.resolve();
function save(){if(DB_READY&&!DEMO)saveQueue=saveQueue.catch(function(){}).then(persistWorkspace).catch(function(e){flash('Não foi possível salvar no banco: '+(e.message||e))})}

var role='sindico', view='dashboard', toastMsg='', financeTab='cobrancas';
var MY='A-302';
var NAV={
  sindico:[['dashboard','Painel'],['unidades','Unidades e moradores'],['financeiro','Financeiro'],['taxas','Taxas adicionais'],['leituras','Leituras e rateios'],['portaria','Portaria'],['comunicacao','Comunicados e chamados']],
  portaria:[['portaria','Portaria'],['comunicacao','Comunicados']],
  morador:[['minha','Minha unidade'],['comunicacao','Comunicados']]
};
var ROLE_LABEL={sindico:'Síndico',portaria:'Portaria',morador:'Morador'};
var uLabel=function(u){return u.bloco+'-'+u.apto};
var unitByLabel=function(l){return S.unidades.filter(function(u){return uLabel(u)===l})[0]};
var paid=function(u){return !!u.pago[MES]};
var r2=function(v){return Math.round(v*100)/100};
var NOMES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MESES=(function(){var out=[],d=new Date();d.setDate(1);d.setMonth(d.getMonth()-12);for(var i=0;i<25;i++){out.push(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}return out})();
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
var totalEsperado=function(){return S.unidades.reduce(function(a,u){return a+cobranca(u).total},0)};
var totalArrecadado=function(){return S.unidades.reduce(function(a,u){return a+(paid(u)?cobranca(u).total:0)},0)};
var totalDespesas=function(){return despMes().reduce(function(a,d){return a+d.valor},0)};
function unitOptions(){return S.unidades.map(function(u){return '<option>'+uLabel(u)+'</option>'}).join('')}
function flash(m){var d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2600)}
function toast(m){toastMsg=m;render();setTimeout(function(){toastMsg='';render()},2200)}

function shell(){
  var items=NAV[role];
  if(!items.some(function(i){return i[0]===view}))view=items[0][0];
  var pend=S.encomendas.filter(function(e){return !e.retirada}).length;
  var navHtml=items.map(function(i){
    var c=''; if(i[0]==='portaria'&&role!=='morador')c='<span class="count">'+pend+'</span>';
    if(i[0]==='financeiro'){var pp=S.pagamentos.filter(function(x){return x.status==='Aguardando conferência'}).length;if(pp)c='<span class="count">'+pp+'</span>'}
    return '<button data-nav="'+i[0]+'"'+(i[0]===view?' aria-current="page"':'')+'>'+i[1]+c+'</button>'}).join('');
  var body={dashboard:vDash,unidades:vUnits,financeiro:vFin,leituras:vLeit,taxas:vTaxas,portaria:vPortaria,comunicacao:vComm,minha:vMinha}[view]();
  return '<aside><div class="brand"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>'+esc(COND)+'</small></div></div>'+
    '<div class="roles"><label>Sessão</label>'+(DEMO?'<span class="pill warn">Demonstração · somente consulta</span>':'')+'<button class="btn ghost sm" data-signout>Sair de '+esc(USER&&USER.email||'')+'</button></div>'+
    '<div class="roles"><label for="mes">Mês de referência</label><select id="mes">'+MESES.map(function(m){return '<option value="'+m+'"'+(m===MES?' selected':'')+'>'+mesLabel(m)+'</option>'}).join('')+'</select></div><nav>'+navHtml+'</nav></aside><main>'+body+'</main>'+(toastMsg?'<div class="toast" role="status">'+esc(toastMsg)+'</div>':'');
}
function head(t,p){return '<div class="head"><div><h2>'+t+'</h2><p>'+p+'</p></div></div>'}

var authMode='login', authNotice='';
function setShell(on){var app=document.getElementById('app');if(app)app.className=on?'shell':'auth'}
function renderAuth(){
  var app=document.getElementById('app');
  setShell(false);
  if(!supabase){app.innerHTML='<main style="max-width:620px;margin:8vh auto;padding:0 16px;width:100%"><div class="panel"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>Gestão simples do seu condomínio</small></div></div><h2>Acesse o sistema</h2><p class="note">Entre em uma demonstração agora ou configure o acesso do condomínio.</p><button class="btn" type="button" data-demo-access>Acessar demonstração sem criar conta</button><p class="note" style="margin-top:12px">Para login e cadastro com salvamento de dados, configure o Supabase neste ambiente.</p></div></main>';return}
  var reg=authMode==='register';
  app.innerHTML='<main style="max-width:620px;margin:8vh auto;padding:0 16px;width:100%"><div class="panel"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">C</div><div><h1>CondoGestor</h1><small>Gestão simples do seu condomínio</small></div></div><h2 style="margin-bottom:6px">'+(reg?'Cadastre seu condomínio':'Entrar no sistema')+'</h2><p class="note">'+(reg?'Crie o acesso do síndico e configure as cobranças padrão.':'Acesse com o e-mail e a senha do síndico.')+'</p>'+(authNotice?'<p class="pill warn" style="margin:10px 0">'+esc(authNotice)+'</p>':'')+
  '<form class="f" id="f-auth">'+(reg?'<label>Seu nome<input id="a-nome" required autocomplete="name"></label><label>Nome do condomínio<input id="a-cond" required></label><label>CNPJ (opcional)<input id="a-cnpj" inputmode="numeric"></label><label class="wide">Endereço (opcional)<input id="a-endereco" autocomplete="street-address"></label><label>Telefone do condomínio<input id="a-telefone" type="tel"></label><label>Condomínio mensal padrão (R$)<input id="a-taxa" type="number" min="0" step="0.01" value="0" required></label><label>Vencimento da cobrança (dia)<input id="a-venc" type="number" min="1" max="28" value="10" required></label><label>Água<select id="a-agua"><option value="rateio">Rateio da conta do condomínio</option><option value="individual">Medidor e cobrança individual</option></select></label><label>Tarifa água (R$/m³)<input id="a-agua-tarifa" type="number" min="0" step="0.0001" value="0"></label><label>Tarifa gás (R$/m³)<input id="a-gas" type="number" min="0" step="0.0001" value="0"></label>':'')+
  '<label>E-mail<input id="a-email" type="email" required autocomplete="email"></label><label>Senha<input id="a-password" type="password" required minlength="8" autocomplete="'+(reg?'new-password':'current-password')+'"></label><button class="btn" type="submit">'+(reg?'Criar conta e condomínio':'Entrar')+'</button></form><button class="btn ghost" type="button" data-auth-mode>'+(reg?'Já tenho uma conta':'Criar uma conta de síndico')+'</button><button class="btn ghost" style="width:100%;margin-top:8px" type="button" data-demo-access>Acessar demonstração sem criar conta</button><p class="note" style="text-align:center;margin-top:8px">Demonstração com dados de exemplo; alterações não serão salvas.</p></div></main>';
}
function renderLoading(message){setShell(false);document.getElementById('app').innerHTML='<main class="panel" style="max-width:620px;margin:12vh auto;width:100%"><h2>CondoGestor</h2><p>'+esc(message)+'</p></main>'}
function dbRows(table){return supabase.from(table).select('*').then(function(r){if(r.error)throw r.error;return r.data||[]})}
async function loadWorkspace(session){
  USER=session.user;
  var profileRes=await supabase.from('profiles').select('nome,email,condominio_id').eq('id',USER.id).maybeSingle();
  if(profileRes.error)throw profileRes.error;
  var rolesRes=await supabase.from('user_roles').select('role').eq('user_id',USER.id);
  if(rolesRes.error)throw rolesRes.error;
  if(!(rolesRes.data||[]).some(function(x){return x.role==='sindico'||x.role==='super_admin'}))throw new Error('Esta conta ainda não está vinculada ao perfil de síndico.');
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
  S.unidades=D.unidades.map(function(u){var ms=morByUnit[u.id]||[],owner=ms.find(function(m){return m.tipo==='proprietario'}),tenants=ms.filter(function(m){return m.tipo==='inquilino'}),dependents=ms.filter(function(m){return m.tipo==='dependente'}),residents=tenants.length?tenants:dependents,primary=residents[0],block=D.blocos.find(function(b){return b.id===u.bloco_id});var lease=primary&&primary.contrato||{};return {id:u.id,bloco:block?block.nome:'',apto:u.numero,dono:owner?owner.nome:'',morador:residents.length?residents.map(function(m){return m.nome}).join(', '):owner?owner.nome:'—',tel:primary&&primary.telefone||owner&&owner.telefone||'—',situacao:u.status==='vago'?'Vago':tenants.length?'Inquilino':'Proprietário residente',taxa:S.config.taxaCondominio,aluguel:Number(u.aluguel_mensal||lease.aluguel_mensal||0),leituras:readByUnit[u.id]||{},pago:{},ownerId:owner&&owner.id,residentIds:residents.map(function(m){return m.id}),contractPath:u.contrato_storage_path,contractName:u.contrato_nome,contractStart:u.contrato_inicio,contractEnd:u.contrato_fim,gasMeter:u.gas_medidor,waterMeter:u.agua_medidor}});
  var paidRows={};D.cobrancas.forEach(function(c){var key=c.unidade_id+':'+c.competencia.slice(0,7);paidRows[key]=paidRows[key]||{total:0,paid:0};paidRows[key].total++;if(c.status==='pago')paidRows[key].paid++});
  D.taxasCobradas.forEach(function(c){var key=c.unidade_id+':'+c.competencia.slice(0,7);paidRows[key]=paidRows[key]||{total:0,paid:0};paidRows[key].total++;if(c.status==='pago')paidRows[key].paid++});
  Object.keys(paidRows).forEach(function(key){var parts=key.split(':'),u=S.unidades.find(function(x){return x.id===parts[0]});if(u&&paidRows[key].total&&paidRows[key].total===paidRows[key].paid)u.pago[parts[1]]=true});
  S.taxas=D.taxas.map(function(t){return {id:t.id,nome:t.nome,valor:Number(t.valor),modo:t.modo,aplica:t.aplica_a,unidades:D.taxasUnidades.filter(function(x){return x.taxa_id===t.id}).map(function(x){return x.unidade_id}),inicio:t.inicio.slice(0,7),fim:t.fim?t.fim.slice(0,7):''}});
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
  DB_READY=true;role='sindico';setMes(MES);view='dashboard';render();
}
async function persistWorkspace(){
  if(!supabase||!USER||!CONDO_ID)return;
  function ok(result){if(result.error)throw result.error;return result.data}
  var blockNames=Array.from(new Set(S.unidades.map(function(u){return u.bloco}).filter(Boolean)));
  for(var bn of blockNames){if(!BLOCK_IDS[bn])BLOCK_IDS[bn]=uid()}
  if(blockNames.length)ok(await supabase.from('blocos').upsert(blockNames.map(function(nome){return {id:BLOCK_IDS[nome],condominio_id:CONDO_ID,nome:nome}}),{onConflict:'id'}));
  var base={condominio_id:CONDO_ID,taxa_condominio:Number(S.config.taxaCondominio||0),vencimento_dia:Math.max(1,Math.min(28,Number(S.config.vencimentoDia||10))),valor_m3_gas:Number(tarifaDe(MES)||0),agua_modo:S.config.modoAgua==='individual'?'individual':'rateio',valor_m3_agua:Number(S.config.tarifaAgua||0),criterio_rateio_agua:S.config.modoAgua==='igual'?'igual':'fracao_ideal',updated_at:new Date().toISOString()};
  ok(await supabase.from('configuracoes_financeiras').upsert(base,{onConflict:'condominio_id'}));
  var unitRows=S.unidades.map(function(u){return {id:u.id,condominio_id:CONDO_ID,bloco_id:BLOCK_IDS[u.bloco],numero:u.apto,status:u.situacao==='Vago'?'vago':'ocupado',aluguel_mensal:Number(u.aluguel||0),gas_medidor:u.gasMeter||null,agua_medidor:u.waterMeter||null,contrato_storage_path:u.contractPath||null,contrato_nome:u.contractName||null,contrato_inicio:u.contractStart||null,contrato_fim:u.contractEnd||null}});
  if(unitRows.length)ok(await supabase.from('unidades').upsert(unitRows,{onConflict:'id'}));
  var residentRows=[];
  S.unidades.forEach(function(u){if(u.dono){u.ownerId=u.ownerId||uid();residentRows.push({id:u.ownerId,condominio_id:CONDO_ID,unidade_id:u.id,nome:u.dono,tipo:'proprietario',telefone:u.tel==='—'?null:u.tel})}var names=(u.morador||'').split(',').map(function(n){return n.trim()}).filter(function(n){return n&&n!=='—'&&n!==u.dono});names.forEach(function(name,i){var residentId=(u.residentIds||[])[i]||uid();u.residentIds=u.residentIds||[];u.residentIds[i]=residentId;residentRows.push({id:residentId,condominio_id:CONDO_ID,unidade_id:u.id,nome:name,tipo:u.situacao==='Inquilino'?'inquilino':'dependente',telefone:u.tel==='—'?null:u.tel,contrato:u.situacao==='Inquilino'?{aluguel_mensal:Number(u.aluguel||0),inicio:u.contractStart||null,fim:u.contractEnd||null}:null})})});
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
  var hist=ms.map(function(x){if(x===MES)return [mesCurto(x),arrec,desp];var ab=NOMES[+x.slice(5)-1].slice(0,3),h=S.historico.filter(function(y){return y[0]===ab})[0];return h?[mesCurto(x),h[1],h[2]]:[mesCurto(x),0,0]});
  var max=Math.max(1,Math.max.apply(null,hist.map(function(h){return Math.max(h[1],h[2])})));
  var bars=hist.map(function(h){return '<div class="bar"><div class="pair"><i style="height:'+(h[1]/max*100).toFixed(1)+'%" title="Arrecadado '+brl(h[1])+'"></i><i class="d" style="height:'+(h[2]/max*100).toFixed(1)+'%" title="Despesas '+brl(h[2])+'"></i></div><span>'+h[0]+'</span></div>'}).join('');
  var dentro=S.visitantes.filter(function(v){return !v.saida});
  var enc=S.encomendas.filter(function(e){return !e.retirada});
  var ab=S.chamados.filter(function(c){return c.status!=='Resolvido'});
  return head('Painel do síndico',MES_LABEL+' · '+S.unidades.length+' unidades')+
  '<div class="kpis">'+
   '<div class="kpi"><span>Arrecadado</span><b>'+brl(arrec)+'</b><small>de '+brl(esp)+'</small></div>'+
   '<div class="kpi"><span>Em aberto</span><b style="color:var(--bad)">'+brl(emAberto)+'</b><small>'+inad.length+' unidades</small></div>'+
   '<div class="kpi"><span>Despesas</span><b>'+brl(desp)+'</b><small>'+despMes().length+' lançamentos</small></div>'+
   '<div class="kpi"><span>Saldo do mês</span><b style="color:'+(arrec-desp>=0?'var(--ok)':'var(--bad)')+'">'+brl(arrec-desp)+'</b><small>arrecadado menos despesas</small></div></div>'+
  '<div class="grid"><div class="panel"><h3>Receita e despesa, últimos 6 meses</h3><div class="bars">'+bars+'</div><div class="legend"><span><b style="background:var(--accent)"></b>Arrecadado</span><span><b style="background:var(--warn)"></b>Despesas</span></div></div>'+
  '<div class="panel"><h3>Taxas em atraso</h3>'+(inad.length?'<div class="list">'+inad.map(function(u){return '<div class="item"><div><b>'+uLabel(u)+'</b> · '+esc(u.dono)+'<p>vencimento 10/10 · '+esc(u.tel)+'</p></div><span class="num">'+brl(cobranca(u).total)+'</span></div>'}).join('')+'</div>':'<p class="empty">Nenhuma unidade em atraso.</p>')+'</div></div>'+
  '<div class="grid"><div class="panel"><h3>Na portaria agora</h3>'+
    '<p style="margin:0 0 6px"><span class="pill warn">'+dentro.length+' visitantes dentro</span> <span class="pill mute">'+enc.length+' encomendas aguardando</span></p>'+
    '<div class="list">'+(dentro.map(function(v){return '<div class="item"><div><b>'+esc(v.nome)+'</b><p>para '+esc(v.unidade)+' · entrou '+fmtDT(v.entrada)+'</p></div></div>'}).join('')||'<p class="empty">Ninguém no condomínio.</p>')+'</div></div>'+
  '<div class="panel"><h3>Chamados em aberto</h3><div class="list">'+(ab.map(function(c){return '<div class="item"><div><b>'+esc(c.titulo)+'</b><p>'+esc(c.unidade)+' · '+fmtD(c.data)+'</p></div><span class="pill '+(c.status==='Aberto'?'bad':'warn')+'">'+c.status+'</span></div>'}).join('')||'<p class="empty">Nenhum chamado em aberto.</p>')+'</div></div></div>';
}

function vUnits(){
  var blocks=Array.from(new Set(S.unidades.map(function(u){return u.bloco}))).sort();
  var board=blocks.map(function(bl){var us=S.unidades.filter(function(u){return u.bloco===bl}).sort(function(a,b){return a.apto.localeCompare(b.apto,undefined,{numeric:true})});return '<section class="block-column"><h3>Bloco '+esc(bl)+'<span class="pill mute">'+us.length+' aptos</span></h3>'+us.map(function(u){var c=cobranca(u),extras=extrasDe(u,MES);return '<article class="unit-tile"><div class="unit-tile-head"><b>Apartamento '+esc(u.apto)+'</b><span class="pill '+(u.situacao==='Vago'?'mute':u.situacao==='Inquilino'?'warn':'ok')+'">'+esc(u.situacao)+'</span></div><p>Proprietário: '+esc(u.dono||'—')+'</p><p>Moradores: '+esc(u.morador||'—')+'</p><p>Contato: '+esc(u.tel||'—')+'</p><div class="unit-tile-stats"><div>Condomínio<b>'+brl(c.taxa)+'</b></div><div>Aluguel<b>'+(u.aluguel?brl(u.aluguel):'—')+'</b></div><div>Medidor de água<b>'+esc(u.waterMeter||'—')+'</b></div><div>Medidor de gás<b>'+esc(u.gasMeter||'—')+'</b></div></div><p>Taxas adicionais: '+(extras.length?extras.map(function(x){return esc(x.nome)+' '+brl(x.valor)}).join(' · '):'—')+'</p><div class="unit-tile-actions">'+(u.contractPath?'<button class="btn sm ghost" data-contract="'+esc(u.contractPath)+'">Abrir contrato</button>':'<span class="pill mute">Sem contrato</span>')+'<button class="btn sm danger" data-del-unit="'+u.id+'">Remover</button></div></article>'}).join('')+'</section>'}).join('');
  return head('Unidades e moradores','Apartamentos agrupados por bloco. A taxa padrão do condomínio se aplica às unidades ocupadas.')+
  '<div class="panel"><h3>Taxa padrão do condomínio</h3><form class="f" id="f-config"><label>Valor mensal (R$)<input id="cfg-taxa" type="number" min="0" step="0.01" value="'+Number(S.config.taxaCondominio||0)+'" required></label><label>Dia de vencimento<input id="cfg-venc" type="number" min="1" max="28" value="'+Number(S.config.vencimentoDia||10)+'" required></label><button class="btn" type="submit">Salvar cobrança padrão</button></form><p class="note">O valor padrão é aplicado automaticamente às unidades ocupadas; o síndico pode gerar ou recalcular as cobranças do mês no Financeiro.</p></div>'+
  '<div class="panel"><h3>Nova unidade</h3><form class="f" id="f-unit">'+
   '<label>Bloco<input id="u-bloco" required maxlength="3" placeholder="A"></label>'+
   '<label>Apartamento<input id="u-apto" required maxlength="6" placeholder="401"></label>'+
   '<label>Proprietário<input id="u-dono" required></label>'+
   '<label>Moradores/inquilinos<input id="u-morador" placeholder="Separe vários nomes por vírgula"></label>'+
   '<label>Telefone<input id="u-tel" placeholder="(47) 90000-0000"></label>'+
   '<label>Situação<select id="u-sit"><option>Proprietário residente</option><option>Inquilino</option><option>Vago</option></select></label>'+
   '<label>Aluguel (R$)<input id="u-alu" type="number" min="0" step="0.01" value="0"></label>'+
   '<label>Medidor de gás<input id="u-gas" placeholder="Ex.: G-101"></label><label>Medidor de água<input id="u-agua" placeholder="Ex.: A-101"></label>'+
   '<label>Início do contrato<input id="u-inicio" type="date"></label><label>Fim do contrato<input id="u-fim" type="date"></label>'+
   '<label class="wide">Contrato de aluguel (PDF, JPG ou PNG)<input id="u-contrato" type="file" accept="application/pdf,image/jpeg,image/png"></label>'+
   '<p class="note wide">Taxa mensal padrão do condomínio: <b>'+brl(S.config.taxaCondominio||0)+'</b>. Configure esse valor no cadastro do condomínio.</p>'+
   '<button class="btn" type="submit">Cadastrar</button></form>'+
  (board?'<div class="block-board">'+board+'</div>':'<div class="panel"><p class="empty">Cadastre os blocos e apartamentos para começar.</p></div>');
}

function vFin(){
  var cob=S.unidades.map(function(u){var p=paid(u),c=cobranca(u);return '<tr><td class="num"><b>'+uLabel(u)+'</b></td><td>'+esc(u.dono)+'</td><td class="num">'+brl(c.taxa)+'</td><td class="num">'+brl(c.agua)+'</td><td class="num">'+brl(c.gas)+'</td>'+tdTaxas(u)+'<td class="num">'+(c.aluguel?brl(c.aluguel):'—')+'</td><td class="num"><b>'+brl(c.total)+'</b></td><td><span class="pill '+(p?'ok':MES>'2026-10'?'warn':'bad')+'">'+(p?'Pago':MES>'2026-10'?'A vencer':'Em atraso')+'</span></td><td><div class="row-actions">'+
    (p?'<button class="btn sm ghost" data-unpay="'+u.id+'">Estornar</button>':'<button class="btn sm" data-pay="'+u.id+'">Marcar como pago</button><button class="btn sm ghost" data-copy="'+u.id+'">Copiar cobrança</button>')+'</div></td></tr>'}).join('');
  var dsp=despMes().slice().sort(function(a,b){return b.data.localeCompare(a.data)}).map(function(d){return '<tr><td class="num">'+fmtD(d.data)+'</td><td>'+esc(d.desc)+'</td><td><span class="pill mute">'+esc(d.cat)+'</span></td><td class="num">'+brl(d.valor)+'</td><td><button class="btn sm danger" data-del-desp="'+d.id+'">Excluir</button></td></tr>'}).join('');
  var tabs=[['cobrancas','Cobranças do mês'],['despesas','Despesas do condomínio'],['meios','Meios de pagamento']];
  var tabBar='<div class="subtabs" role="tablist" aria-label="Seções do financeiro">'+tabs.map(function(t){return '<button type="button" role="tab" data-ftab="'+t[0]+'" aria-selected="'+(t[0]===financeTab)+'">'+t[1]+'</button>'}).join('')+'</div>';
  var cobrancas='<div class="panel"><h3>Cobranças automáticas</h3><p class="note">O sistema calcula taxa padrão, água, gás, taxas adicionais vigentes e aluguel quando configurado. Recalcular é seguro: lançamentos pagos são preservados.</p><button class="btn" data-generate-bills>Gerar/recalcular cobranças de '+esc(MES_LABEL)+'</button></div>'+
  '<div class="panel"><h3>Cobranças de '+esc(MES_LABEL)+'</h3><p class="note"><label for="c-alu-fin">Aluguel na cobrança: </label><select id="c-alu-fin" style="width:auto"><option value="nao'+(!S.config.cobrarAluguel?'" selected':'"')+'>Repasse ao proprietário (fora do total)</option><option value="sim'+(S.config.cobrarAluguel?'" selected':'"')+'>Somar ao total a pagar</option></select></p><div class="tablewrap"><table><thead><tr><th>Unidade</th><th>Responsável</th><th>Taxa</th><th>Água</th><th>Gás</th>'+thTaxas()+'<th>Aluguel</th><th>Total a pagar</th><th>Situação</th><th></th></tr></thead><tbody>'+cob+'</tbody></table></div></div>';
  var despesas='<div class="panel"><h3>Lançar despesa</h3><form class="f" id="f-desp">'+
   '<label>Descrição<input id="d-desc" required></label>'+
   '<label>Categoria<select id="d-cat"><option>Pessoal</option><option>Consumo</option><option>Manutenção</option><option>Serviços</option><option>Reserva</option></select></label>'+
   '<label>Valor (R$)<input id="d-valor" type="number" min="0.01" step="0.01" required></label>'+
   '<label>Data<input id="d-data" type="date" required value="'+MES+'-15"></label>'+
   '<button class="btn" type="submit">Lançar despesa</button></form></div>'+
  '<div class="panel"><h3>Despesas do condomínio · '+esc(MES_LABEL)+'</h3><div class="tablewrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead><tbody>'+dsp+'</tbody><tfoot><tr><td colspan="3"><b>Total</b></td><td class="num"><b>'+brl(totalDespesas())+'</b></td><td></td></tr></tfoot></table></div></div>';
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
    S.unidades.map(function(u){return '<label class="chk"><input type="checkbox" id="tu-'+u.id+'">'+uLabel(u)+'</label>'}).join('')+'</div></div>'+
   '<button class="btn" type="submit">Cadastrar taxa</button></form>'+
  '<p class="note">Total de taxas adicionais em '+MES_LABEL+': <b class="num">'+brl(somaMes)+'</b>. Cada taxa entra no total a pagar de cada apartamento na aba Financeiro.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>Taxa</th><th>Valor</th><th>Cobrada de</th><th>Em '+mesCurto(MES)+'</th><th>Vigência</th><th>Situação</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="empty">Nenhuma taxa adicional cadastrada.</td></tr>')+'</tbody></table></div></div>';
}

var TIPOS={pix:'PIX',transferencia:'Transferência bancária',boleto:'Boleto',dinheiro:'Dinheiro ou cheque',mercadopago:'Mercado Pago'};
function meioResumo(m){var d=m.dados||{};
  if(m.tipo==='pix')return esc((d.tipoChave||'Chave')+': '+(d.chave||'—')+(d.favorecido?' · '+d.favorecido:''));
  if(m.tipo==='transferencia')return esc((d.banco||'Banco')+' · ag. '+(d.agencia||'—')+' · conta '+(d.conta||'—')+(d.favorecido?' · '+d.favorecido:''));
  if(m.tipo==='mercadopago'){var f=[['pix','PIX'],['cartao','cartão'],['boleto','boleto']].filter(function(x){return d[x[0]]}).map(function(x){return x[1]}).join(', ');return esc('Conta '+(d.email||'—')+' · aceita '+(f||'—'))}
  return esc(m.instrucoes||'—')}
function g(tipos,html){return '<label data-tipos="'+tipos+'"'+(tipos.split(' ').indexOf('pix')<0?' hidden':'')+'>'+html+'</label>'}
function vPag(inFinance){
  var linhas=S.meios.map(function(m){var mp=m.tipo==='mercadopago';
    return '<tr><td><b>'+esc(m.nome)+'</b></td><td><span class="pill mute">'+TIPOS[m.tipo]+'</span>'+(mp?' <span class="pill warn">Demonstração</span>':'')+'</td><td>'+meioResumo(m)+'</td><td><span class="pill '+(m.ativo?'ok':'mute')+'">'+(m.ativo?'Ativo':'Desativado')+'</span></td><td><div class="row-actions"><button class="btn sm ghost" data-meio-toggle="'+m.id+'">'+(m.ativo?'Desativar':'Ativar')+'</button><button class="btn sm danger" data-del-meio="'+m.id+'">Excluir</button></div></td></tr>'}).join('');
  var infos=S.pagamentos.slice().sort(function(a,b){return b.data.localeCompare(a.data)}).map(function(x){var cls=x.status==='Confirmado'?'ok':x.status==='Recusado'?'bad':'warn';
    return '<tr><td class="num">'+fmtDT(x.data)+'</td><td class="num">'+esc(x.unidade)+'</td><td>'+mesLabel(x.mes)+'</td><td class="num">'+brl(x.valor)+'</td><td>'+esc(x.meio)+'</td><td><span class="pill '+cls+'">'+x.status+'</span></td><td>'+(x.status==='Aguardando conferência'?'<div class="row-actions"><button class="btn sm" data-pag-ok="'+x.id+'">Confirmar</button><button class="btn sm danger" data-pag-no="'+x.id+'">Recusar</button></div>':'')+'</td></tr>'}).join('');
  var tipoOpts=Object.keys(TIPOS).map(function(k){return '<option value="'+k+'">'+TIPOS[k]+'</option>'}).join('');
  return (inFinance?'':head('Meios de pagamento','Como os moradores pagam as faturas: manual ou pelo Mercado Pago'))+
  '<div class="panel"><h3>Novo meio de pagamento</h3><form class="f" id="f-meio">'+
   '<label>Nome exibido ao morador<input id="p-nome" required placeholder="PIX do condomínio"></label>'+
   '<label>Tipo<select id="p-tipo">'+tipoOpts+'</select></label>'+
   g('pix','Tipo da chave<select id="p-tipochave"><option>CNPJ</option><option>CPF</option><option>E-mail</option><option>Telefone</option><option>Chave aleatória</option></select>')+
   g('pix','Chave PIX<input id="p-chave">')+
   g('pix transferencia','Favorecido<input id="p-fav">')+
   g('transferencia','Banco<input id="p-banco">')+
   g('transferencia','Agência<input id="p-ag">')+
   g('transferencia','Conta<input id="p-conta">')+
   g('mercadopago','E-mail da conta Mercado Pago<input id="p-mpmail" type="email">')+
   g('mercadopago','Public Key (opcional)<input id="p-mppk" placeholder="APP_USR-...">')+
   '<div class="wide" data-tipos="mercadopago" hidden><span style="font-size:12px;color:var(--muted)">Formas aceitas no Mercado Pago</span><div class="checks"><label class="chk"><input type="checkbox" id="p-mp-pix" checked>PIX</label><label class="chk"><input type="checkbox" id="p-mp-cartao" checked>Cartão</label><label class="chk"><input type="checkbox" id="p-mp-boleto" checked>Boleto</label></div></div>'+
   '<label class="wide">Instruções ao morador<textarea id="p-instr" rows="2" placeholder="Como pagar, horários, prazo para enviar o comprovante"></textarea></label>'+
   '<button class="btn" type="submit">Cadastrar meio de pagamento</button></form>'+
  '<p class="note"><b>Mercado Pago:</b> nesta demonstração o pagamento é simulado e nenhuma credencial é pedida. Na versão com servidor, a cobrança é criada com o Access Token do condomínio guardado no servidor, nunca digitado nesta tela, e o Mercado Pago avisa o sistema quando o morador paga, baixando a fatura sozinho.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Dados</th><th>Situação</th><th></th></tr></thead><tbody>'+(linhas||'<tr><td colspan="5" class="empty">Nenhum meio de pagamento cadastrado.</td></tr>')+'</tbody></table></div></div>'+
  '<div class="panel"><h3>Pagamentos informados pelos moradores</h3><div class="tablewrap"><table><thead><tr><th>Data</th><th>Unidade</th><th>Mês</th><th>Valor</th><th>Meio</th><th>Situação</th><th></th></tr></thead><tbody>'+(infos||'<tr><td colspan="7" class="empty">Nenhum pagamento informado ainda.</td></tr>')+'</tbody></table></div></div>';
}
function registrarPag(m,status){var u=unitByLabel(MY)||S.unidades[0],c=cobranca(u);
  S.pagamentos.push({id:uid(),unidadeId:u.id,unidade:uLabel(u),mes:MES,valor:c.total,meio:m.nome,meioId:m.id,data:now(),status:status});
  if(status==='Confirmado')u.pago[MES]=true;save()}
function pagarHtml(u,c,p){
  var h='<div class="panel" style="margin-bottom:16px"><h3>Como pagar</h3>';
  var regs=S.pagamentos.filter(function(x){return x.unidadeId===u.id&&x.mes===MES}),ult=regs[regs.length-1];
  if(p)return h+'<p class="note" style="margin:0">Pagamento de '+MES_LABEL+' confirmado'+(ult&&ult.status==='Confirmado'?' via '+esc(ult.meio):'')+'.</p></div>';
  var ativos=S.meios.filter(function(m){return m.ativo});
  if(!ativos.length)return h+'<p class="empty">O síndico ainda não cadastrou meios de pagamento.</p></div>';
  h+='<p class="note">Valor a pagar: <b class="num">'+brl(c.total)+'</b></p>';
  if(ult&&ult.status==='Aguardando conferência')h+='<p class="note"><span class="pill warn">Aguardando conferência</span> Você avisou o pagamento em '+fmtDT(ult.data)+' via '+esc(ult.meio)+'. O síndico vai confirmar.</p>';
  if(ult&&ult.status==='Recusado')h+='<p class="note"><span class="pill bad">Recusado</span> O síndico não confirmou o pagamento enviado via '+esc(ult.meio)+'. Confira o valor e avise de novo.</p>';
  return h+'<div class="list">'+ativos.map(function(m){
    var acao=m.tipo==='mercadopago'?'<button class="btn sm" data-mp="'+m.id+'">Pagar com Mercado Pago (simulação)</button>':
      (m.tipo==='pix'?'<button class="btn sm ghost" data-copy-key="'+m.id+'">Copiar chave</button>':'')+'<button class="btn sm" data-informar="'+m.id+'">Já paguei</button>';
    return '<div class="item"><div><b>'+esc(m.nome)+'</b><p>'+meioResumo(m)+'</p>'+(m.instrucoes?'<p>'+esc(m.instrucoes)+'</p>':'')+'</div><div class="row-actions">'+acao+'</div></div>'}).join('')+'</div></div>';
}

var leitTab='agua';
function rin(form,pref,u,val,lab,ro){return '<td><input class="mini num" form="'+form+'" id="'+pref+u.id+'" type="number" min="0" step="0.001" value="'+val+'"'+(ro?' readonly title="Igual à leitura atual do mês anterior"':'')+' aria-label="'+lab+' '+uLabel(u)+'"></td>'}
function leitTable(k,form,pa,pb,nomeU){
  var rows='',totV=0,totM=0;
  S.unidades.forEach(function(u){
    var r=getRead(u,k,MES),cb=cobranca(u),val=k==='agua'?cb.agua:cb.gas;totV+=val;totM+=lei(u,k);
    rows+='<tr><td class="num"><b>'+uLabel(u)+'</b><br><small style="color:var(--muted)">'+u.situacao+'</small></td>'+
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
  var hr=S.unidades.map(function(u){return '<tr><td class="num"><b>'+uLabel(u)+'</b></td>'+ms.map(function(m){var r=getRead(u,k,m);return '<td class="num">'+(r[2]?leiM(u,k,m).toFixed(1):'—')+'</td>'}).join('')+'</tr>'}).join('');
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
  return '<div class="panel" style="margin-top:16px"><h3>Meus chamados</h3><p class="note">Abra uma solicitação para o síndico e acompanhe o andamento aqui.</p><form class="f" id="f-ch"><label class="wide">O que precisa de atendimento?<input id="c-tit" required placeholder="Ex.: manutenção no banheiro"></label><button class="btn" type="submit">Abrir chamado</button></form><div class="list">'+items+'</div></div>';
}

function vMinha(){
  var u=unitByLabel(MY)||S.unidades[0],ul=uLabel(u);
  var p=paid(u),c=cobranca(u),enc=S.encomendas.filter(function(e){return e.unidade===ul&&!e.retirada});
  var tr=function(l,v,cls){return '<tr'+(cls?' class="'+cls+'"':'')+'><td>'+l+'</td><td class="num">'+v+'</td></tr>'};
  var rows=tr('Taxa condominial',brl(c.taxa));
  c.extras.forEach(function(e){rows+=tr(esc(e.nome),brl(e.valor))});
  if(c.extras.length>1)rows+=tr('<i>Soma das taxas adicionais</i>','<i>'+brl(c.extrasTotal)+'</i>');
  rows+=tr('Água ('+lei(u,'agua').toFixed(1)+' m³)',brl(c.agua))+tr('Gás ('+lei(u,'gas').toFixed(1)+' m³)',brl(c.gas));
  if(c.aluguel)rows+=tr('Aluguel'+(S.config.cobrarAluguel?'':' (pago ao proprietário)'),brl(c.aluguel));
  rows+=tr(S.config.cobrarAluguel&&c.aluguel?'Total a pagar (com aluguel)':'Total a pagar ao condomínio',brl(c.total),'tot');
  if(c.aluguel&&!S.config.cobrarAluguel)rows+=tr('Total com aluguel',brl(r2(c.total+c.aluguel)),'tot');
  var st=p?'<span class="pill ok">Pago</span>':(MES>'2026-10'?'<span class="pill warn">A vencer</span>':'<span class="pill bad">Em atraso</span>');
  return head('Minha unidade',esc(COND)+' · '+ul+' · '+MES_LABEL)+
  '<div class="panel"><div class="unit-card"><div><small>Ver unidade</small><select id="my-unit">'+S.unidades.map(function(x){var l=uLabel(x);return '<option'+(l===ul?' selected':'')+'>'+l+'</option>'}).join('')+'</select></div><div><small>Proprietário</small>'+esc(u.dono)+'</div><div><small>Morador</small>'+esc(u.morador)+'</div><div><small>'+MES_LABEL+'</small>'+st+'</div></div></div>'+
  '<div class="grid"><div class="panel"><h3>Valores do mês</h3><div class="tablewrap"><table><tbody>'+rows+'</tbody></table></div></div>'+
  '<div>'+pagarHtml(u,c,p)+'<div class="panel"><h3>Encomendas na portaria</h3>'+(enc.length?'<div class="list">'+enc.map(function(e){return '<div class="item"><div><b>'+esc(e.transp)+'</b><p>chegou '+fmtDT(e.chegada)+'</p></div><span class="pill warn">Aguardando retirada</span></div>'}).join('')+'</div>':'<p class="empty">Nenhuma encomenda aguardando.</p>')+'</div>'+
  '<div class="panel" style="margin-top:16px"><h3>Último comunicado</h3>'+(S.comunicados[0]?'<b>'+esc(S.comunicados[0].titulo)+'</b><p style="color:var(--muted)">'+esc(S.comunicados[0].texto)+'</p>':'<p class="empty">Sem comunicados.</p>')+'</div></div></div>'+(role==='morador'?vTenantCalls(ul):'');
}

function render(){
  if(!supabase){renderAuth();return}
  if(!DB_READY){renderAuth();return}
  var a=document.activeElement, id=a&&a.id;
  setShell(true);
  document.getElementById('app').innerHTML=shell();
  if(id==='mes'){var el=document.getElementById(id);if(el)el.focus()}
}

document.addEventListener('change',function(e){
  if(e.target.id==='mes'){setMes(e.target.value);render()}
  if(e.target.id==='my-unit'){MY=e.target.value;render()}
  if(e.target.id==='c-alu-fin'){S.config.cobrarAluguel=e.target.value==='sim';save();render()}
  if(e.target.id==='p-tipo'){var tp=e.target.value;document.querySelectorAll('#f-meio [data-tipos]').forEach(function(el){el.hidden=el.dataset.tipos.split(' ').indexOf(tp)<0})}
});
document.addEventListener('click',async function(e){
  var financeTabButton=e.target.closest('[data-ftab]');if(financeTabButton){financeTab=financeTabButton.dataset.ftab;render();return}
  if(e.target.closest('[data-demo-access]')){loadDemo();return}
  if(DEMO){var demoNav=e.target.closest('[data-nav]');if(demoNav){view=demoNav.dataset.nav;render();return}if(e.target.closest('[data-signout]')){DEMO=false;DB_READY=false;USER=null;CONDO_ID='';COND='';S=seed();renderAuth();return}if(e.target.closest('button'))flash('A demonstração é somente para consulta. As alterações não serão salvas.');return}
  var authButton=e.target.closest('[data-auth-mode]');
  if(authButton){authMode=authMode==='register'?'login':'register';authNotice='';renderAuth();return}
  if(e.target.closest('[data-signout]')){DB_READY=false;USER=null;CONDO_ID='';supabase.auth.signOut().then(function(){renderAuth()});return}
  var aw=e.target.closest('a[data-aviso]');
  if(aw){var pk=S.encomendas.filter(function(x){return x.id===aw.dataset.aviso})[0];if(pk){pk.avisado=now();save();setTimeout(render,80)}return}
  var t=e.target.closest('button');if(!t)return;
  var d=t.dataset, f;
  if(d.generateBills){renderLoading('Gerando cobranças do mês…');var generated=await supabase.rpc('gerar_cobrancas_condominio',{_competencia:MES+'-01'});if(generated.error){flash('Falha ao gerar cobranças: '+generated.error.message);render();return}await loadWorkspace({user:USER});flash('Cobranças do mês recalculadas e salvas');return}
  if(d.contract){var signed=await supabase.storage.from('contratos-locacao').createSignedUrl(d.contract,60);if(signed.error){flash('Não foi possível abrir o contrato: '+signed.error.message);return}window.open(signed.data.signedUrl,'_blank','noopener');return}
  if(d.nav){view=d.nav;render();return}
  if(d.pay){f=S.unidades.filter(function(u){return u.id===d.pay})[0];f.pago[MES]=true;save();await saveQueue;var paidResult=await Promise.all([supabase.from('cobrancas_unidade').update({status:'pago'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01'),supabase.from('cobrancas_taxas_adicionais').update({status:'pago'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01')]);var paidError=paidResult.find(function(x){return x.error});if(paidError){flash('Não foi possível confirmar a baixa: '+paidError.error.message);return}toast('Pagamento registrado para '+uLabel(f));return}
  if(d.unpay){f=S.unidades.filter(function(u){return u.id===d.unpay})[0];delete f.pago[MES];save();await saveQueue;var unpayResult=await Promise.all([supabase.from('cobrancas_unidade').update({status:'pendente'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01'),supabase.from('cobrancas_taxas_adicionais').update({status:'pendente'}).eq('condominio_id',CONDO_ID).eq('unidade_id',f.id).eq('competencia',MES+'-01')]);var unpayError=unpayResult.find(function(x){return x.error});if(unpayError){flash('Não foi possível estornar: '+unpayError.error.message);return}toast('Pagamento estornado');return}
  if(d.copy){f=S.unidades.filter(function(u){return u.id===d.copy})[0];
    var c=cobranca(f);var txt='Olá, '+f.dono+'. Cobrança de '+MES_LABEL+' da unidade '+uLabel(f)+': taxa '+brl(c.taxa)+', água '+brl(c.agua)+', gás '+brl(c.gas)+c.extras.map(function(e){return ', '+e.nome.toLowerCase()+' '+brl(e.valor)}).join('')+(S.config.cobrarAluguel&&c.aluguel?', aluguel '+brl(c.aluguel):'')+'. Total '+brl(c.total)+', vencido em 10/10. Pedimos a regularização. Administração do '+COND+'.';
    try{navigator.clipboard.writeText(txt).then(function(){toast('Mensagem de cobrança copiada')},function(){toast(txt)})}catch(x){toast(txt)}return}
  if(d.delUnit){var removed=S.unidades.find(function(u){return u.id===d.delUnit});var removedLabel=removed?uLabel(removed):'';var delUnit=await supabase.from('unidades').delete().eq('condominio_id',CONDO_ID).eq('id',d.delUnit);if(delUnit.error){flash('Não foi possível remover a unidade: '+delUnit.error.message);return}S.unidades=S.unidades.filter(function(u){return u.id!==d.delUnit});S.prestadores=S.prestadores.filter(function(x){return x.unidade!==removedLabel});S.veiculos=S.veiculos.filter(function(x){return x.unidade!==removedLabel});S.visitantes=S.visitantes.filter(function(x){return x.unidade!==removedLabel});S.encomendas=S.encomendas.filter(function(x){return x.unidade!==removedLabel});S.chamados=S.chamados.filter(function(x){return x.unidade!==removedLabel});save();toast('Unidade removida');return}
  if(d.delDesp){var dd=await supabase.from('despesas_condominio').delete().eq('condominio_id',CONDO_ID).eq('id',d.delDesp);if(dd.error){flash(dd.error.message);return}S.despesas=S.despesas.filter(function(x){return x.id!==d.delDesp});save();toast('Despesa excluída');return}
  if(d.delNot){var dn=await supabase.from('comunicados').delete().eq('condominio_id',CONDO_ID).eq('id',d.delNot);if(dn.error){flash(dn.error.message);return}S.comunicados=S.comunicados.filter(function(x){return x.id!==d.delNot});save();toast('Comunicado excluído');return}
  if(d.ltab){leitTab=d.ltab;render();return}
  if(d.ptab){portTab=d.ptab;render();return}
  if(d.pout){f=S.prestadores.filter(function(x){return x.id===d.pout})[0];f.saida=now();save();toast('Saída do prestador registrada');return}
  if(d.vout){f=S.veiculos.filter(function(x){return x.id===d.vout})[0];f.saida=now();save();toast('Saída do veículo registrada');return}
  if(d.delVei){var dv=await supabase.from('veiculos_condominio').delete().eq('condominio_id',CONDO_ID).eq('id',d.delVei);if(dv.error){flash(dv.error.message);return}S.veiculos=S.veiculos.filter(function(x){return x.id!==d.delVei});save();toast('Veículo removido');return}
  if(d.meioToggle){f=S.meios.filter(function(x){return x.id===d.meioToggle})[0];f.ativo=!f.ativo;save();toast(f.ativo?'Meio de pagamento ativado':'Meio de pagamento desativado');return}
  if(d.delMeio){var dm=await supabase.from('meios_pagamento_condominio').delete().eq('condominio_id',CONDO_ID).eq('id',d.delMeio);if(dm.error){flash(dm.error.message);return}S.meios=S.meios.filter(function(x){return x.id!==d.delMeio});save();toast('Meio de pagamento excluído');return}
  if(d.pagOk){f=S.pagamentos.filter(function(x){return x.id===d.pagOk})[0];var un=S.unidades.filter(function(x){return x.id===f.unidadeId})[0];if(un)un.pago[f.mes]=true;f.status='Confirmado';save();toast('Pagamento confirmado e fatura baixada');return}
  if(d.pagNo){f=S.pagamentos.filter(function(x){return x.id===d.pagNo})[0];f.status='Recusado';save();toast('Pagamento recusado');return}
  if(d.copyKey){f=S.meios.filter(function(x){return x.id===d.copyKey})[0];var k=(f.dados&&f.dados.chave)||'';try{navigator.clipboard.writeText(k).then(function(){flash('Chave PIX copiada')},function(){flash(k)})}catch(x){flash(k)}return}
  if(d.informar){f=S.meios.filter(function(x){return x.id===d.informar})[0];registrarPag(f,'Aguardando conferência');toast('Pagamento informado. Aguarde a confirmação do síndico');return}
  if(d.mp){f=S.meios.filter(function(x){return x.id===d.mp})[0];registrarPag(f,'Confirmado');toast('Pagamento aprovado (simulação) e fatura baixada');return}
  if(d.endTaxa){f=S.taxas.filter(function(x){return x.id===d.endTaxa})[0];f.fim=MES;save();toast('Taxa encerrada após '+MES_LABEL);return}
  if(d.delTaxa){var dt=await supabase.from('taxas_adicionais').delete().eq('condominio_id',CONDO_ID).eq('id',d.delTaxa);if(dt.error){flash('A taxa não pode ser removida enquanto houver cobranças vinculadas: '+dt.error.message);return}S.taxas=S.taxas.filter(function(x){return x.id!==d.delTaxa});save();toast('Taxa excluída');return}
  if(d.out){f=S.visitantes.filter(function(x){return x.id===d.out})[0];f.saida=now();save();toast('Saída registrada');return}
  if(d.pick){f=S.encomendas.filter(function(x){return x.id===d.pick})[0];f.retirada=now();save();toast('Encomenda entregue');return}
  if(d.next){f=S.chamados.filter(function(x){return x.id===d.next})[0];f.status=f.status==='Aberto'?'Em andamento':'Resolvido';save();toast('Chamado atualizado');return}
});
document.addEventListener('submit',async function(e){
  e.preventDefault();var id=e.target.id, v=function(i){return document.getElementById(i).value.trim()};
  if(id==='f-auth'){
    var email=v('a-email'),password=v('a-password');authNotice='';renderLoading('Validando acesso…');
    (async function(){try{
      if(authMode==='register'){
        var meta={nome:v('a-nome'),condominio_nome:v('a-cond'),condominio_cnpj:v('a-cnpj'),condominio_endereco:v('a-endereco'),condominio_telefone:v('a-telefone'),condominio_email:email,taxa_condominio:Number(v('a-taxa')),vencimento_dia:Number(v('a-venc')),agua_modo:v('a-agua'),valor_m3_agua:Number(v('a-agua-tarifa')),valor_m3_gas:Number(v('a-gas')),criterio_rateio_agua:'fracao_ideal'};
        var created=await supabase.auth.signUp({email:email,password:password,options:{data:meta}});if(created.error)throw created.error;
        if(!created.data.session){authNotice='Cadastro criado. Confirme o e-mail e depois entre para acessar o condomínio.';authMode='login';renderAuth();return}
        await loadWorkspace(created.data.session);
      }else{
        var logged=await supabase.auth.signInWithPassword({email:email,password:password});if(logged.error)throw logged.error;
        await loadWorkspace(logged.data.session);
      }
    }catch(err){DB_READY=false;USER=null;authNotice=err.message||'Não foi possível acessar o sistema.';renderAuth()}})();return;
  }
  if(DEMO){flash('A demonstração é somente para consulta. As alterações não serão salvas.');return}
  if(id==='f-unit'){var dono=v('u-dono'),situacao=v('u-sit'),morador=v('u-morador')||(situacao==='Proprietário residente'?dono:'');if(situacao==='Inquilino'&&!morador){flash('Informe ao menos um inquilino');return}var unitId=uid(),file=document.getElementById('u-contrato').files[0],contractPath='';if(file){if(file.size>10*1024*1024){flash('O contrato deve ter no máximo 10 MB');return}var uploaded=await supabase.storage.from('contratos-locacao').upload(CONDO_ID+'/'+unitId+'/'+file.name,file,{upsert:true,contentType:file.type});if(uploaded.error){flash('Falha ao anexar contrato: '+uploaded.error.message);return}contractPath=uploaded.data.path}S.unidades.push({id:unitId,bloco:v('u-bloco').toUpperCase(),apto:v('u-apto'),dono:dono,morador:morador||'—',tel:v('u-tel')||'—',situacao:situacao,taxa:S.config.taxaCondominio,aluguel:parseFloat(v('u-alu'))||0,leituras:{},pago:{},contractPath:contractPath,contractName:file&&file.name,contractStart:v('u-inicio')||null,contractEnd:v('u-fim')||null,gasMeter:v('u-gas')||'',waterMeter:v('u-agua')||''});save();toast('Unidade cadastrada')}
  else if(id==='f-config'){S.config.taxaCondominio=parseFloat(v('cfg-taxa'))||0;S.config.vencimentoDia=parseInt(v('cfg-venc'),10)||10;S.unidades.forEach(function(u){u.taxa=S.config.taxaCondominio});save();toast('Taxa padrão salva e cobranças atualizadas')}
  else if(id==='f-agua'){var bad=saveReads('agua','aa-','ab-');if(bad){flash('A leitura atual da unidade '+bad+' não pode ser menor que a leitura anterior');return}S.config.contaMes[MES]=parseFloat(v('c-agua'))||0;S.config.tarifaAgua=parseFloat(v('c-agua-tarifa'))||0;S.config.modoAgua=v('c-modo');save();toast('Água salva e cobrança recalculada')}
  else if(id==='f-gas'){var bad2=saveReads('gas','ga-','gb-');if(bad2){flash('A leitura atual da unidade '+bad2+' não pode ser menor que a leitura anterior');return}S.config.tarifaMes[MES]=parseFloat(v('c-gas'))||0;save();toast('Gás salvo e cobrança recalculada')}
  else if(id==='f-prest'){S.prestadores.push({id:uid(),nome:v('s-nome'),empresa:v('s-emp')||'—',servico:v('s-serv'),doc:v('s-doc')||'—',unidade:v('s-un'),autorizado:v('s-aut')||'—',entrada:now(),saida:''});save();toast('Entrada do prestador registrada')}
  else if(id==='f-vei'){var pl=v('w-placa').toUpperCase().replace(/\s/g,'');
    if(!/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/.test(pl)){flash('Placa inválida. Use ABC-1D23 ou ABC-1234');return}
    pl=pl.replace('-','');pl=pl.slice(0,3)+'-'+pl.slice(3);var tp2=v('w-tipo');
    S.veiculos.push({id:uid(),placa:pl,modelo:v('w-modelo'),cor:v('w-cor'),tipo:tp2,unidade:v('w-un'),vaga:v('w-vaga')||'—',entrada:tp2==='Morador'?'':now(),saida:''});save();toast('Veículo registrado')}
  else if(id==='f-meio'){var tp=v('p-tipo'),dd={},ck=function(i){return document.getElementById(i).checked};
    if(tp==='pix'){dd={tipoChave:v('p-tipochave'),chave:v('p-chave'),favorecido:v('p-fav')};if(!dd.chave){flash('Informe a chave PIX');return}}
    if(tp==='transferencia'){dd={banco:v('p-banco'),agencia:v('p-ag'),conta:v('p-conta'),favorecido:v('p-fav')};if(!dd.conta){flash('Informe a conta');return}}
    if(tp==='mercadopago'){dd={email:v('p-mpmail'),publicKey:v('p-mppk'),pix:ck('p-mp-pix'),cartao:ck('p-mp-cartao'),boleto:ck('p-mp-boleto')};if(!dd.email){flash('Informe o e-mail da conta Mercado Pago');return}}
    S.meios.push({id:uid(),nome:v('p-nome'),tipo:tp,ativo:true,dados:dd,instrucoes:v('p-instr')});save();toast('Meio de pagamento cadastrado')}
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
  else if(id==='f-ch'){var un=role==='morador'?MY:v('c-un');S.chamados.push({id:uid(),unidade:un,titulo:v('c-tit'),status:'Aberto',data:now().slice(0,10)});save();toast('Chamado aberto')}
});
render();
if(supabase){
  supabase.auth.getSession().then(function(result){
    if(result.error){authNotice=result.error.message;renderAuth();return}
    if(result.data.session){renderLoading('Carregando dados do condomínio…');loadWorkspace(result.data.session).catch(function(err){DB_READY=false;USER=null;authNotice=err.message||'Falha ao carregar o condomínio.';renderAuth()})}
    else renderAuth();
  });
  supabase.auth.onAuthStateChange(function(event){
    if(event==='SIGNED_OUT'){DB_READY=false;USER=null;CONDO_ID='';renderAuth()}
  });
}
})();
