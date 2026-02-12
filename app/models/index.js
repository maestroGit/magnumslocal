// app/models/index.js
// Centraliza la importación y relación de modelos

import User from './User.js';
import Wallet from './Wallet.js';
import DenominacionOrigen from './DenominacionOrigen.js';
import Variedad from './Variedad.js';
import TipoVino from './TipoVino.js';
import DoVariedad from './DoVariedad.js';
import DoTipoVino from './DoTipoVino.js';
import DoBodega from './DoBodega.js';
import RegulacionDo from './RegulacionDo.js';
import DoClima from './DoClima.js';
import DoGeografia from './DoGeografia.js';

User.hasMany(Wallet, { foreignKey: 'usuario_id', as: 'wallets' });
Wallet.belongsTo(User, { foreignKey: 'usuario_id', as: 'user' });

DenominacionOrigen.belongsToMany(Variedad, {
	through: DoVariedad,
	foreignKey: 'do_id',
	otherKey: 'variedad_id',
	as: 'variedades'
});
Variedad.belongsToMany(DenominacionOrigen, {
	through: DoVariedad,
	foreignKey: 'variedad_id',
	otherKey: 'do_id',
	as: 'denominaciones'
});

DenominacionOrigen.belongsToMany(TipoVino, {
	through: DoTipoVino,
	foreignKey: 'do_id',
	otherKey: 'tipo_vino_id',
	as: 'tipos_vino'
});
TipoVino.belongsToMany(DenominacionOrigen, {
	through: DoTipoVino,
	foreignKey: 'tipo_vino_id',
	otherKey: 'do_id',
	as: 'denominaciones'
});

DenominacionOrigen.belongsToMany(User, {
	through: DoBodega,
	foreignKey: 'do_id',
	otherKey: 'bodega_id',
	as: 'bodegas'
});
User.belongsToMany(DenominacionOrigen, {
	through: DoBodega,
	foreignKey: 'bodega_id',
	otherKey: 'do_id',
	as: 'denominaciones'
});

DenominacionOrigen.hasMany(RegulacionDo, { foreignKey: 'do_id', as: 'regulaciones' });
RegulacionDo.belongsTo(DenominacionOrigen, { foreignKey: 'do_id', as: 'denominacion' });

DenominacionOrigen.hasMany(DoClima, { foreignKey: 'do_id', as: 'climas' });
DoClima.belongsTo(DenominacionOrigen, { foreignKey: 'do_id', as: 'denominacion' });

DenominacionOrigen.hasMany(DoGeografia, { foreignKey: 'do_id', as: 'geografia' });
DoGeografia.belongsTo(DenominacionOrigen, { foreignKey: 'do_id', as: 'denominacion' });

export {
	User,
	Wallet,
	DenominacionOrigen,
	Variedad,
	TipoVino,
	DoVariedad,
	DoTipoVino,
	DoBodega,
	RegulacionDo,
	DoClima,
	DoGeografia
};
