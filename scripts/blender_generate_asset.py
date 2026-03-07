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


def jitter(v: float, spread: float = 0.08) -> float:
    return v * (1.0 + random.uniform(-spread, spread))


def color_for_biome(biome: str) -> tuple[float, float, float, float]:
    if biome == 'forest':
        return (0.28, 0.72, 0.35, 1.0)
    if biome == 'city':
        return (0.52, 0.6, 0.72, 1.0)
    return (0.94, 0.78, 0.36, 1.0)


def make_material(name: str, rgba: tuple[float, float, float, float], roughness: float = 0.45) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    if bsdf is not None:
        bsdf.inputs['Base Color'].default_value = rgba
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Specular IOR Level'].default_value = 0.28
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    data = obj.data
    if data and hasattr(data, 'materials'):
        if len(data.materials) == 0:
            data.materials.append(mat)
        else:
            data.materials[0] = mat


def add_cube(name: str, size: tuple[float, float, float], loc: tuple[float, float, float], color: tuple[float, float, float, float]) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    apply_material(obj, make_material(f'{name}_mat', color))
    return obj


def add_cylinder(name: str, radius: float, depth: float, loc: tuple[float, float, float], color: tuple[float, float, float, float], rot=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rot
    apply_material(obj, make_material(f'{name}_mat', color))
    return obj


def add_sphere(name: str, radius: float, loc: tuple[float, float, float], color: tuple[float, float, float, float]) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=20, ring_count=14)
    obj = bpy.context.active_object
    obj.name = name
    apply_material(obj, make_material(f'{name}_mat', color))
    return obj


def add_torus(name: str, major: float, minor: float, loc: tuple[float, float, float], color: tuple[float, float, float, float], rot=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, major_segments=16, minor_segments=10)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rot
    apply_material(obj, make_material(f'{name}_mat', color, roughness=0.35))
    return obj


def create_fruit(asset_id: str, biome: str) -> list[bpy.types.Object]:
    objs: list[bpy.types.Object] = []
    fruit_color = (0.95, 0.26, 0.22, 1.0) if 'apple' in asset_id else (0.97, 0.52, 0.2, 1.0)
    body = add_sphere(f'{asset_id}_body', jitter(0.25), (0, 0, 0.25), fruit_color)
    body.scale = (1.0, 1.0, 0.88)
    objs.append(body)
    objs.append(add_cylinder(f'{asset_id}_stem', 0.03, 0.17, (0, 0, 0.52), (0.24, 0.16, 0.08, 1.0)))
    bpy.ops.mesh.primitive_plane_add(size=0.12, location=(0.1, 0.0, 0.55))
    leaf = bpy.context.active_object
    leaf.rotation_euler = (0.0, math.radians(30), math.radians(22))
    leaf.scale = (1.0, 0.6, 1.0)
    apply_material(leaf, make_material(f'{asset_id}_leaf_mat', color_for_biome(biome)))
    objs.append(leaf)
    return objs


def create_bento(asset_id: str) -> list[bpy.types.Object]:
    objs = [
        add_cube(f'{asset_id}_tray', (0.24, 0.18, 0.07), (0, 0, 0.07), (0.2, 0.2, 0.22, 1.0)),
        add_cube(f'{asset_id}_rice', (0.1, 0.07, 0.04), (-0.08, 0.01, 0.16), (0.92, 0.92, 0.9, 1.0)),
        add_cube(f'{asset_id}_salmon', (0.09, 0.06, 0.03), (0.07, -0.02, 0.15), (0.94, 0.42, 0.34, 1.0)),
        add_cylinder(f'{asset_id}_chop_l', 0.01, 0.32, (0.0, 0.12, 0.2), (0.5, 0.3, 0.12, 1.0), rot=(math.radians(90), math.radians(7), 0)),
        add_cylinder(f'{asset_id}_chop_r', 0.01, 0.32, (0.02, 0.1, 0.2), (0.5, 0.3, 0.12, 1.0), rot=(math.radians(90), math.radians(7), 0)),
    ]
    return objs


def create_lantern(asset_id: str) -> list[bpy.types.Object]:
    body = add_sphere(f'{asset_id}_body', 0.22, (0, 0, 0.26), (0.86, 0.18, 0.2, 1.0))
    body.scale = (1.0, 1.0, 1.25)
    return [
        body,
        add_torus(f'{asset_id}_top', 0.12, 0.014, (0, 0, 0.48), (0.95, 0.82, 0.45, 1.0), rot=(math.radians(90), 0, 0)),
        add_torus(f'{asset_id}_mid', 0.16, 0.012, (0, 0, 0.27), (0.95, 0.82, 0.45, 1.0), rot=(math.radians(90), 0, 0)),
    ]


def create_shrub(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_sphere(f'{asset_id}_main', 0.25, (0, 0, 0.24), (0.2, 0.62, 0.28, 1.0)),
        add_sphere(f'{asset_id}_side_l', 0.14, (-0.14, 0.05, 0.18), (0.2, 0.66, 0.3, 1.0)),
        add_sphere(f'{asset_id}_side_r', 0.12, (0.13, -0.03, 0.17), (0.22, 0.64, 0.31, 1.0)),
        add_cylinder(f'{asset_id}_trunk', 0.03, 0.14, (0, 0, 0.08), (0.35, 0.2, 0.1, 1.0)),
    ]


def create_bamboo(asset_id: str) -> list[bpy.types.Object]:
    objs: list[bpy.types.Object] = []
    for i, x in enumerate([-0.08, 0.0, 0.08]):
        objs.append(add_cylinder(f'{asset_id}_stalk_{i}', 0.03, 0.56 + i * 0.06, (x, 0, 0.28 + i * 0.03), (0.32, 0.72, 0.36, 1.0)))
    objs.append(add_cube(f'{asset_id}_base', (0.13, 0.13, 0.03), (0, 0, 0.03), (0.27, 0.18, 0.1, 1.0)))
    return objs


def create_mailbox(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cylinder(f'{asset_id}_post', 0.03, 0.42, (0, 0, 0.21), (0.58, 0.38, 0.2, 1.0)),
        add_cube(f'{asset_id}_box', (0.16, 0.11, 0.12), (0, 0, 0.46), (0.87, 0.18, 0.2, 1.0)),
        add_cube(f'{asset_id}_flag', (0.03, 0.005, 0.06), (0.18, 0, 0.5), (0.97, 0.92, 0.35, 1.0)),
    ]


def create_bike(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_torus(f'{asset_id}_wheel_f', 0.12, 0.018, (0.18, 0, 0.12), (0.08, 0.08, 0.1, 1.0), rot=(math.radians(90), 0, 0)),
        add_torus(f'{asset_id}_wheel_b', 0.12, 0.018, (-0.18, 0, 0.12), (0.08, 0.08, 0.1, 1.0), rot=(math.radians(90), 0, 0)),
        add_cylinder(f'{asset_id}_frame', 0.015, 0.34, (0, 0, 0.2), (0.4, 0.58, 0.95, 1.0), rot=(0, math.radians(90), 0)),
        add_cylinder(f'{asset_id}_seat', 0.012, 0.12, (-0.05, 0, 0.31), (0.08, 0.08, 0.1, 1.0), rot=(0, math.radians(90), 0)),
    ]


def create_sign(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cylinder(f'{asset_id}_pole', 0.03, 0.55, (0, 0, 0.27), (0.35, 0.37, 0.4, 1.0)),
        add_cube(f'{asset_id}_plate', (0.23, 0.03, 0.13), (0, 0, 0.52), (0.97, 0.93, 0.37, 1.0)),
    ]


def create_kettle(asset_id: str) -> list[bpy.types.Object]:
    body = add_sphere(f'{asset_id}_body', 0.24, (0, 0, 0.24), (0.2, 0.66, 0.66, 1.0))
    body.scale = (1.0, 1.0, 0.8)
    return [
        body,
        add_torus(f'{asset_id}_handle', 0.18, 0.016, (0, 0, 0.35), (0.16, 0.18, 0.2, 1.0), rot=(0, math.radians(90), 0)),
        add_cylinder(f'{asset_id}_spout', 0.03, 0.17, (0.2, 0, 0.25), (0.16, 0.18, 0.2, 1.0), rot=(math.radians(90), 0, math.radians(35))),
    ]


def create_crate(asset_id: str) -> list[bpy.types.Object]:
    objs = [add_cube(f'{asset_id}_body', (0.2, 0.2, 0.18), (0, 0, 0.18), (0.62, 0.4, 0.23, 1.0))]
    for i, z in enumerate([0.1, 0.18, 0.26]):
        objs.append(add_cube(f'{asset_id}_slat_{i}', (0.22, 0.015, 0.015), (0, 0.205, z), (0.48, 0.3, 0.15, 1.0)))
    return objs


def create_scooter(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_torus(f'{asset_id}_wheel_f', 0.1, 0.017, (0.16, 0, 0.1), (0.06, 0.06, 0.08, 1.0), rot=(math.radians(90), 0, 0)),
        add_torus(f'{asset_id}_wheel_b', 0.1, 0.017, (-0.16, 0, 0.1), (0.06, 0.06, 0.08, 1.0), rot=(math.radians(90), 0, 0)),
        add_cube(f'{asset_id}_body', (0.25, 0.06, 0.05), (0, 0, 0.18), (0.95, 0.2, 0.22, 1.0)),
        add_cylinder(f'{asset_id}_handle', 0.012, 0.32, (0.2, 0, 0.34), (0.2, 0.2, 0.2, 1.0)),
    ]


def create_rock(asset_id: str) -> list[bpy.types.Object]:
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.23, subdivisions=2, location=(0, 0, 0.23))
    rock = bpy.context.active_object
    rock.name = f'{asset_id}_rock'
    rock.scale = (jitter(1.2, 0.2), jitter(0.9, 0.2), jitter(0.8, 0.2))
    apply_material(rock, make_material(f'{asset_id}_rock_mat', (0.48, 0.46, 0.44, 1.0), roughness=0.88))
    return [rock]


def create_tanuki(asset_id: str) -> list[bpy.types.Object]:
    body = add_sphere(f'{asset_id}_body', 0.22, (0, 0, 0.22), (0.56, 0.4, 0.24, 1.0))
    head = add_sphere(f'{asset_id}_head', 0.16, (0, 0, 0.46), (0.56, 0.4, 0.24, 1.0))
    ear_l = add_sphere(f'{asset_id}_ear_l', 0.05, (-0.09, 0, 0.6), (0.36, 0.25, 0.14, 1.0))
    ear_r = add_sphere(f'{asset_id}_ear_r', 0.05, (0.09, 0, 0.6), (0.36, 0.25, 0.14, 1.0))
    return [body, head, ear_l, ear_r]


def create_koi_banner(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cylinder(f'{asset_id}_pole', 0.02, 0.6, (0, 0, 0.3), (0.62, 0.6, 0.6, 1.0)),
        add_cube(f'{asset_id}_banner', (0.24, 0.02, 0.08), (0.18, 0, 0.48), (0.92, 0.42, 0.18, 1.0)),
        add_sphere(f'{asset_id}_eye', 0.018, (0.35, 0.02, 0.5), (1.0, 1.0, 1.0, 1.0)),
    ]


def create_garden_lamp(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cylinder(f'{asset_id}_post', 0.03, 0.55, (0, 0, 0.28), (0.2, 0.2, 0.22, 1.0)),
        add_cube(f'{asset_id}_lamp', (0.12, 0.12, 0.1), (0, 0, 0.62), (0.98, 0.9, 0.6, 1.0)),
        add_cube(f'{asset_id}_roof', (0.15, 0.15, 0.03), (0, 0, 0.71), (0.26, 0.2, 0.16, 1.0)),
    ]


def create_shinto_gate(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cylinder(f'{asset_id}_pillar_l', 0.045, 0.55, (-0.18, 0, 0.27), (0.84, 0.2, 0.16, 1.0)),
        add_cylinder(f'{asset_id}_pillar_r', 0.045, 0.55, (0.18, 0, 0.27), (0.84, 0.2, 0.16, 1.0)),
        add_cube(f'{asset_id}_beam_top', (0.27, 0.04, 0.04), (0, 0, 0.58), (0.84, 0.2, 0.16, 1.0)),
        add_cube(f'{asset_id}_beam_mid', (0.22, 0.03, 0.03), (0, 0, 0.49), (0.22, 0.12, 0.08, 1.0)),
    ]


def create_vending_machine(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cube(f'{asset_id}_body', (0.18, 0.12, 0.35), (0, 0, 0.35), (0.86, 0.2, 0.22, 1.0)),
        add_cube(f'{asset_id}_window', (0.12, 0.01, 0.18), (0, 0.11, 0.44), (0.7, 0.88, 1.0, 1.0)),
        add_cube(f'{asset_id}_slot', (0.1, 0.01, 0.03), (0, 0.11, 0.2), (0.2, 0.2, 0.22, 1.0)),
    ]


def create_mini_truck(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cube(f'{asset_id}_cab', (0.16, 0.12, 0.14), (-0.08, 0, 0.24), (0.78, 0.86, 0.9, 1.0)),
        add_cube(f'{asset_id}_bed', (0.2, 0.12, 0.09), (0.12, 0, 0.2), (0.75, 0.75, 0.78, 1.0)),
        add_torus(f'{asset_id}_wheel_fl', 0.06, 0.015, (-0.14, 0.1, 0.08), (0.08, 0.08, 0.1, 1.0), rot=(math.radians(90), 0, 0)),
        add_torus(f'{asset_id}_wheel_fr', 0.06, 0.015, (-0.14, -0.1, 0.08), (0.08, 0.08, 0.1, 1.0), rot=(math.radians(90), 0, 0)),
        add_torus(f'{asset_id}_wheel_bl', 0.06, 0.015, (0.14, 0.1, 0.08), (0.08, 0.08, 0.1, 1.0), rot=(math.radians(90), 0, 0)),
        add_torus(f'{asset_id}_wheel_br', 0.06, 0.015, (0.14, -0.1, 0.08), (0.08, 0.08, 0.1, 1.0), rot=(math.radians(90), 0, 0)),
    ]


def create_cherry_tree(asset_id: str) -> list[bpy.types.Object]:
    return [
        add_cylinder(f'{asset_id}_trunk', 0.05, 0.52, (0, 0, 0.26), (0.42, 0.28, 0.18, 1.0)),
        add_sphere(f'{asset_id}_canopy_1', 0.2, (-0.06, 0.03, 0.58), (0.97, 0.66, 0.82, 1.0)),
        add_sphere(f'{asset_id}_canopy_2', 0.18, (0.1, -0.02, 0.56), (0.97, 0.66, 0.82, 1.0)),
        add_sphere(f'{asset_id}_canopy_3', 0.16, (0.0, 0.08, 0.63), (0.98, 0.72, 0.85, 1.0)),
    ]


def create_generic(asset_id: str, biome: str) -> list[bpy.types.Object]:
    return [
        add_cube(f'{asset_id}_core', (0.2, 0.18, 0.14), (0, 0, 0.16), color_for_biome(biome)),
        add_torus(f'{asset_id}_trim', 0.12, 0.01, (0, 0, 0.34), (0.95, 0.9, 0.7, 1.0), rot=(math.radians(90), 0, 0)),
    ]


def build_asset(asset_id: str, biome: str) -> list[bpy.types.Object]:
    key = asset_id.lower()
    if 'apple' in key or 'orange' in key:
        return create_fruit(asset_id, biome)
    if 'bento' in key:
        return create_bento(asset_id)
    if 'lantern' in key:
        return create_lantern(asset_id)
    if 'shrub' in key:
        return create_shrub(asset_id)
    if 'bamboo' in key:
        return create_bamboo(asset_id)
    if 'mailbox' in key:
        return create_mailbox(asset_id)
    if 'bike' in key:
        return create_bike(asset_id)
    if 'sign' in key:
        return create_sign(asset_id)
    if 'kettle' in key:
        return create_kettle(asset_id)
    if 'crate' in key:
        return create_crate(asset_id)
    if 'scooter' in key:
        return create_scooter(asset_id)
    if 'rock' in key:
        return create_rock(asset_id)
    if 'tanuki' in key:
        return create_tanuki(asset_id)
    if 'koi-banner' in key:
        return create_koi_banner(asset_id)
    if 'garden-lamp' in key:
        return create_garden_lamp(asset_id)
    if 'shinto-gate' in key:
        return create_shinto_gate(asset_id)
    if 'vending-machine' in key:
        return create_vending_machine(asset_id)
    if 'mini-truck' in key:
        return create_mini_truck(asset_id)
    if 'cherry-tree' in key:
        return create_cherry_tree(asset_id)
    return create_generic(asset_id, biome)


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
