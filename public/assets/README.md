# Modelo 3D del cerebro (GLTF / GLB)

Poné acá el modelo anatómico con el nombre exacto:

```
public/assets/brain.glb
```

La app lo carga automáticamente al abrir la pestaña **"Mi cerebro"**.
Si el archivo no existe o falla, cae al cerebro **procedural** (no se rompe nada).

## Dónde conseguir un modelo (con licencia)

Buscá "brain anatomy" en formato **glTF/GLB** y con licencia libre (CC0 / CC-BY):

- **Sketchfab** → filtrá por "Downloadable" + licencia. Ideal: un modelo que tenga
  los **lóbulos como objetos/mallas separadas** (frontal, parietal, temporal,
  occipital, cerebelo, tronco). Descargalo en **glTF Binary (.glb)**.
- **NIH 3D** (3d.nih.gov) → modelos médicos, muchos de dominio público.
- **Z-Anatomy** (proyecto open-source) → anatomía con partes nombradas.

> Si el .glb viene comprimido con **Draco**, re-exportalo sin compresión desde
> Blender (o pedímelo y agrego el DracoLoader).

## Cómo mapear los lóbulos a los niveles

1. Poné el `.glb` y abrí la app + la **consola del navegador** (F12).
2. Al cargar, la consola imprime:  `[Brain3D] Mallas del modelo: [...]`
   con los nombres de cada malla.
3. Editá `REGION_MESH_MAP` en `public/js/brain3d.js`, asociando un trozo del
   nombre a cada región. Ejemplo:

   ```js
   const REGION_MESH_MAP = {
     'frontal':    'prefrontal',
     'precentral': 'motor',
     'parietal':   'parietal',
     'occipital':  'occipital',
     'temporal':   'temporal',
     'hippocamp':  'hippocampus',
     'cerebellum': 'cerebellum',
     'brainstem':  'brainstem',
   };
   ```

   Los `regionId` válidos son los `brainRegion` de `data/levels.json`.

### Modos de pintado

- **regions**: si mapeás al menos una región, cada lóbulo se ilumina en su nivel.
- **progressive**: si no hay mapeo, el cerebro entero se pinta de a poco según
  cuántos niveles llevás (respeta tu idea original de "pintar el cerebro de a poco").

### Ajustes finos (en `brain3d.js`)

- `MODEL_TARGET_SIZE`: escala general del modelo.
- `MODEL_ROTATION`: `[x, y, z]` en radianes si el modelo aparece torcido.
