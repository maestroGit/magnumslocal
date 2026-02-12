// app/controllers/variedadController.js
// CRUD para variedades

import { Variedad, DenominacionOrigen } from '../models/index.js';

/**
 * POST /variedades - Crear variedad
 */
export const createVariedad = async (req, res) => {
  try {
    const { nombre, descripcion, color } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    const variedad = await Variedad.create({ nombre, descripcion, color });

    return res.status(201).json({
      success: true,
      data: variedad
    });
  } catch (error) {
    console.error('[VARIEDAD] Error creando variedad:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear variedad',
      details: error.message
    });
  }
};

/**
 * GET /variedades - Listar variedades
 */
export const getVariedades = async (req, res) => {
  try {
    const { color, includeDenominaciones = 'false' } = req.query;

    const where = {};
    if (color) where.color = color;

    const include = [];
    if (includeDenominaciones === 'true') {
      include.push({ model: DenominacionOrigen, as: 'denominaciones' });
    }

    const variedades = await Variedad.findAll({
      where,
      include,
      order: [['nombre', 'ASC']]
    });

    return res.json({
      success: true,
      data: variedades
    });
  } catch (error) {
    console.error('[VARIEDAD] Error listando variedades:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al listar variedades',
      details: error.message
    });
  }
};

/**
 * GET /variedades/:id - Obtener variedad por ID
 */
export const getVariedadById = async (req, res) => {
  try {
    const { id } = req.params;

    const variedad = await Variedad.findByPk(id, {
      include: [{ model: DenominacionOrigen, as: 'denominaciones' }]
    });

    if (!variedad) {
      return res.status(404).json({
        success: false,
        error: 'Variedad no encontrada'
      });
    }

    return res.json({
      success: true,
      data: variedad
    });
  } catch (error) {
    console.error('[VARIEDAD] Error obteniendo variedad:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener variedad',
      details: error.message
    });
  }
};

/**
 * PUT /variedades/:id - Actualizar variedad
 */
export const updateVariedad = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const variedad = await Variedad.findByPk(id);

    if (!variedad) {
      return res.status(404).json({
        success: false,
        error: 'Variedad no encontrada'
      });
    }

    await variedad.update(updateData);

    return res.json({
      success: true,
      data: variedad
    });
  } catch (error) {
    console.error('[VARIEDAD] Error actualizando variedad:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar variedad',
      details: error.message
    });
  }
};

/**
 * DELETE /variedades/:id - Eliminar variedad
 */
export const deleteVariedad = async (req, res) => {
  try {
    const { id } = req.params;

    const variedad = await Variedad.findByPk(id);

    if (!variedad) {
      return res.status(404).json({
        success: false,
        error: 'Variedad no encontrada'
      });
    }

    await variedad.destroy();

    return res.json({
      success: true,
      message: 'Variedad eliminada correctamente'
    });
  } catch (error) {
    console.error('[VARIEDAD] Error eliminando variedad:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar variedad',
      details: error.message
    });
  }
};
