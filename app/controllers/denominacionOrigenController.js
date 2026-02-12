// app/controllers/denominacionOrigenController.js
// CRUD para denominaciones de origen

import { DenominacionOrigen, Variedad, TipoVino, User, RegulacionDo, DoClima, DoGeografia } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * POST /denominaciones - Crear DO
 */
export const createDO = async (req, res) => {
  try {
    const doData = req.body;

    if (!doData.nombre || !doData.tipo || !doData.pais) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: nombre, tipo, pais'
      });
    }

    const nuevaDO = await DenominacionOrigen.create(doData);

    return res.status(201).json({
      success: true,
      data: nuevaDO
    });
  } catch (error) {
    console.error('[DO] Error creando DO:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear denominacion de origen',
      details: error.message
    });
  }
};

/**
 * GET /denominaciones - Listar DOs con filtros
 */
export const getDOs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      tipo,
      pais,
      region,
      clima,
      search,
      includeVariedades = 'false',
      includeTipos = 'false',
      includeBodegas = 'false'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (tipo) where.tipo = tipo;
    if (pais) where.pais = pais;
    if (region) where.region = region;
    if (clima) where.clima = clima;

    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { region: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const include = [];
    if (includeVariedades === 'true') {
      include.push({ model: Variedad, as: 'variedades' });
    }
    if (includeTipos === 'true') {
      include.push({ model: TipoVino, as: 'tipos_vino' });
    }
    if (includeBodegas === 'true') {
      include.push({ model: User, as: 'bodegas' });
    }

    const { count, rows } = await DenominacionOrigen.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['nombre', 'ASC']]
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[DO] Error listando DOs:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al listar denominaciones',
      details: error.message
    });
  }
};

/**
 * GET /denominaciones/:id - Obtener DO por ID
 */
export const getDOById = async (req, res) => {
  try {
    const { id } = req.params;

    const do_ = await DenominacionOrigen.findByPk(id, {
      include: [
        { model: Variedad, as: 'variedades' },
        { model: TipoVino, as: 'tipos_vino' },
        { model: User, as: 'bodegas' },
        { model: RegulacionDo, as: 'regulaciones' },
        { model: DoClima, as: 'climas' },
        { model: DoGeografia, as: 'geografia' }
      ]
    });

    if (!do_) {
      return res.status(404).json({
        success: false,
        error: 'Denominacion de origen no encontrada'
      });
    }

    return res.json({
      success: true,
      data: do_
    });
  } catch (error) {
    console.error('[DO] Error obteniendo DO:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener denominacion',
      details: error.message
    });
  }
};

/**
 * PUT /denominaciones/:id - Actualizar DO
 */
export const updateDO = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const do_ = await DenominacionOrigen.findByPk(id);

    if (!do_) {
      return res.status(404).json({
        success: false,
        error: 'Denominacion de origen no encontrada'
      });
    }

    await do_.update(updateData);

    return res.json({
      success: true,
      data: do_
    });
  } catch (error) {
    console.error('[DO] Error actualizando DO:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar denominacion',
      details: error.message
    });
  }
};

/**
 * DELETE /denominaciones/:id - Eliminar DO
 */
export const deleteDO = async (req, res) => {
  try {
    const { id } = req.params;

    const do_ = await DenominacionOrigen.findByPk(id);

    if (!do_) {
      return res.status(404).json({
        success: false,
        error: 'Denominacion de origen no encontrada'
      });
    }

    await do_.destroy();

    return res.json({
      success: true,
      message: 'Denominacion eliminada correctamente'
    });
  } catch (error) {
    console.error('[DO] Error eliminando DO:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar denominacion',
      details: error.message
    });
  }
};

/**
 * POST /denominaciones/:id/variedades - Agregar variedad a DO
 */
export const addVariedadToDO = async (req, res) => {
  try {
    const { id } = req.params;
    const { variedad_id } = req.body;

    const do_ = await DenominacionOrigen.findByPk(id);
    if (!do_) {
      return res.status(404).json({ success: false, error: 'DO no encontrada' });
    }

    const variedad = await Variedad.findByPk(variedad_id);
    if (!variedad) {
      return res.status(404).json({ success: false, error: 'Variedad no encontrada' });
    }

    await do_.addVariedades(variedad);

    return res.json({
      success: true,
      message: 'Variedad agregada a la DO'
    });
  } catch (error) {
    console.error('[DO] Error agregando variedad:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al agregar variedad',
      details: error.message
    });
  }
};

/**
 * POST /denominaciones/:id/tipos - Agregar tipo de vino a DO
 */
export const addTipoToDO = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_vino_id } = req.body;

    const do_ = await DenominacionOrigen.findByPk(id);
    if (!do_) {
      return res.status(404).json({ success: false, error: 'DO no encontrada' });
    }

    const tipo = await TipoVino.findByPk(tipo_vino_id);
    if (!tipo) {
      return res.status(404).json({ success: false, error: 'Tipo de vino no encontrado' });
    }

    await do_.addTipos_vino(tipo);

    return res.json({
      success: true,
      message: 'Tipo de vino agregado a la DO'
    });
  } catch (error) {
    console.error('[DO] Error agregando tipo:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al agregar tipo de vino',
      details: error.message
    });
  }
};

/**
 * POST /denominaciones/:id/bodegas - Agregar bodega a DO
 */
export const addBodegaToDO = async (req, res) => {
  try {
    const { id } = req.params;
    const { bodega_id } = req.body;

    const do_ = await DenominacionOrigen.findByPk(id);
    if (!do_) {
      return res.status(404).json({ success: false, error: 'DO no encontrada' });
    }

    const bodega = await User.findByPk(bodega_id);
    if (!bodega || bodega.role !== 'winery') {
      return res.status(404).json({ success: false, error: 'Bodega no encontrada' });
    }

    await do_.addBodegas(bodega);

    return res.json({
      success: true,
      message: 'Bodega agregada a la DO'
    });
  } catch (error) {
    console.error('[DO] Error agregando bodega:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al agregar bodega',
      details: error.message
    });
  }
};
