import argparse
import math
import random
import sys
from pathlib import Path

import bpy


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--asset-id', required=True)
    parser.add_argument('--biome', default='suburb')
    parser.add_argument('--style-tags', default='anime')
    parser.add_argument('--output', required=True)
    parser.add_argument('--seed', type=int, default=7)
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def color_for_biome(biome: str) -> tuple[float, float, float, float]:
    if biome == 'forest':
        return (0.27, 0.74, 0.34, 1.0)
    if biome == 'city':
        return (0.48, 0.56, 0.69, 1.0)
    return (0.97, 0.76, 0.3, 1.0)


def make_material(name: str, rgba: tuple[float, float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    if bsdf is not None:
        bsdf.inputs['Base Color'].default_value = rgba
        bsdf.inputs['Roughness'].default_value = 0.45
        bsdf.inputs['Specular IOR Level'].default_value = 0.32
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    data = obj.data
    if data and hasattr(data, 'materials'):
        if len(data.materials) == 0:
            data.materials.append(mat)
        else:
            data.materials[0] = mat


def create_apple_style(asset_id: str, biome: str) -> list[bpy.types.Object]:
    objs: list[bpy.types.Object] = []

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.26, location=(0, 0, 0.26), segments=20, ring_count=14)
    body = bpy.context.active_object
    body.name = f'{asset_id}_body'
    body.scale = (1.0, 1.0, 0.9)
    apply_material(body, make_material(f'{asset_id}_body_mat', (0.93, 0.24, 0.25, 1.0)))
    objs.append(body)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.16, location=(0.0, 0.0, 0.52))
    stem = bpy.context.active_object
    stem.name = f'{asset_id}_stem'
    apply_material(stem, make_material(f'{asset_id}_stem_mat', (0.25, 0.16, 0.08, 1.0)))
    objs.append(stem)

    bpy.ops.mesh.primitive_plane_add(size=0.12, location=(0.08, 0.0, 0.56))
    leaf = bpy.context.active_object
    leaf.name = f'{asset_id}_leaf'
    leaf.rotation_euler = (0.0, math.radians(35), math.radians(18))
    leaf.scale = (1.0, 0.6, 1.0)
    apply_material(leaf, make_material(f'{asset_id}_leaf_mat', color_for_biome(biome)))
    objs.append(leaf)

    return objs


def create_box_style(asset_id: str, biome: str) -> list[bpy.types.Object]:
    objs: list[bpy.types.Object] = []

    bpy.ops.mesh.primitive_cube_add(size=0.4, location=(0, 0, 0.2))
    box = bpy.context.active_object
    box.name = f'{asset_id}_box'
    box.scale = (1.0, 0.9, 0.8)
    apply_material(box, make_material(f'{asset_id}_box_mat', color_for_biome(biome)))
    objs.append(box)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.11, minor_radius=0.015, location=(0, 0, 0.43), major_segments=16, minor_segments=8)
    ring = bpy.context.active_object
    ring.name = f'{asset_id}_ring'
    ring.rotation_euler = (math.radians(90), 0, 0)
    apply_material(ring, make_material(f'{asset_id}_ring_mat', (0.96, 0.91, 0.67, 1.0)))
    objs.append(ring)

    return objs


def build_asset(asset_id: str, biome: str) -> list[bpy.types.Object]:
    lowered = asset_id.lower()
    if 'apple' in lowered or 'orange' in lowered or 'fruit' in lowered:
        return create_apple_style(asset_id, biome)
    return create_box_style(asset_id, biome)


def select_assets(objs: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def export_glb(output_path: str) -> None:
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
      filepath=str(out),
      export_format='GLB',
      use_selection=True,
      export_yup=True,
      export_apply=True,
      export_texcoords=True,
      export_normals=True,
      export_materials='EXPORT',
    )


def main() -> None:
    cli_args = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    args = parse_args(cli_args)

    random.seed(args.seed)
    clear_scene()
    objs = build_asset(args.asset_id, args.biome)
    select_assets(objs)
    export_glb(args.output)

    print(f'Generated {args.asset_id} -> {args.output}')


if __name__ == '__main__':
    main()
