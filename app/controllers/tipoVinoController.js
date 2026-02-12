// app/controllers/tipoVinoController.js
// CRUD para tipos de vino

import { TipoVino, DenominacionOrigen } from '../models/index.js';

/**
 * POST /tipos-vino - Crear tipo de vino
 */
export const createTipoVino = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    const tipo = await TipoVino.create({ nombre, descripcion });

    return res.status(201).json({
      success: true,
      data: tipo
    });
  } catch (error) {
    console.error('[TIPO_VINO] Error creando tipo:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear tipo de vino',
      details: error.message
    });
  }
};

/**
 * GET /tipos-vino - Listar tipos de vino
 */
export const getTiposVino = async (req, res) => {
  try {
    const { includeDenominaciones = 'false' } = req.query;

    const include = [];
    if (includeDenominaciones === 'true') {
      include.push({ model: DenominacionOrigen, as: 'denominaciones' });
    }

    const tipos = await TipoVino.findAll({
      include,
      order: [['nombre', 'ASC']]
    });

    return res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    console.error('[TIPO_VINO] Error listando tipos:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al listar tipos de vino',
      details: error.message
    });
  }
};

/**
 * GET /tipos-vino/:id - Obtener tipo por ID
 */
export const getTipoVinoById = async (req, res) => {
  try {
    const { id } = req.params;

    const tipo = await TipoVino.findByPk(id, {
      include: [{ model: DenominacionOrigen, as: 'denominaciones' }]
    });

    if (!tipo) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de vino no encontrado'
      });
    }

    return res.json({
      success: true,
      data: tipo
    });
  } catch (error) {
    console.error('[TIPO_VINO] Error obteniendo tipo:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener tipo de vino',
      details: error.message
    });
  }
};

/**
 * PUT /tipos-vino/:id - Actualizar tipo
 */
export const updateTipoVino = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const tipo = await TipoVino.findByPk(id);

    if (!tipo) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de vino no encontrado'
      });
    }

    await tipo.update(updateData);

    return res.json({
      success: true,
      data: tipo
    });
  } catch (error) {
    console.error('[TIPO_VINO] Error actualizando tipo:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar tipo de vino',
      details: error.message
    });
  }
};

/**
 * DELETE /tipos-vino/:id - Eliminar tipo
 */
export const deleteTipoVino = async (req, res) => {
  try {
    const { id } = req.params;

    const tipo = await TipoVino.findByPk(id);

    if (!tipo) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de vino no encontrado'
      });
    }

    await tipo.destroy();

    return res.json({
      success: true,
      message: 'Tipo de vino eliminado correctamente'
    });
  } catch (error) {
    console.error('[TIPO_VINO] Error eliminando tipo:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar tipo de vino',
      details: error.message
    });
  }
};
