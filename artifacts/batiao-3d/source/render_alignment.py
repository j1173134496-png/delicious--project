"""Render the single Lv.1 style-alignment prototype for visual review.

This is intentionally a preview-only renderer. It does not export GLB files or
touch the mini-program. Run from the repository root with:
  blender --background artifacts/batiao-3d/source/batiao_master.blend \
    --python artifacts/batiao-3d/source/render_alignment.py
"""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'previews' / 'alignment'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = -0.80
scene.view_settings.gamma = 1.0

# Warm studio world with enough contrast to keep cream fur and brown eyes readable.
scene.world.use_nodes = True
world_bg = scene.world.node_tree.nodes.get('Background')
world_bg.inputs['Color'].default_value = (1.0, 0.78, 0.82, 1.0)
world_bg.inputs['Strength'].default_value = 0.25

for loc, energy, size in [
    ((-3.5, -4.5, 5.5), 280, 4.0),
    ((3.8, -2.0, 3.2), 120, 3.0),
    ((0.0, 2.5, 5.5), 180, 3.5),
]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0, 0, 1.0)) - light.location).to_track_quat('-Z', 'Y').to_euler()

# Soft floor for a grounded toy-render look.
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.02))
floor = bpy.context.object
floor.name = 'Alignment floor'
floor.data.materials.append(bpy.data.materials.new('Alignment floor material'))
floor.data.materials[0].diffuse_color = (1.0, 0.72, 0.76, 1.0)
floor.data.materials[0].use_nodes = True
floor_bsdf = floor.data.materials[0].node_tree.nodes.get('Principled BSDF')
floor_bsdf.inputs['Base Color'].default_value = (1.0, 0.72, 0.76, 1.0)
floor_bsdf.inputs['Roughness'].default_value = 0.82

# Vertical cyclorama so the subject reads against a consistent blush-pink field.
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 2.0, 5.0), rotation=(1.5708, 0, 0))
backdrop = bpy.context.object
backdrop.name = 'Alignment backdrop'
backdrop.data.materials.append(bpy.data.materials.new('Alignment backdrop material'))
backdrop.data.materials[0].use_nodes = True
backdrop_bsdf = backdrop.data.materials[0].node_tree.nodes.get('Principled BSDF')
backdrop_bsdf.inputs['Base Color'].default_value = (1.0, 0.58, 0.68, 1.0)
backdrop_bsdf.inputs['Roughness'].default_value = 1.0

bpy.ops.object.camera_add(location=(2.45, -4.65, 1.55))
camera = bpy.context.object
camera.name = 'Alignment camera'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.75
camera.rotation_euler = (Vector((0.0, -0.02, 1.08)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera

for form in ('lv1-baby', 'lv2-genki', 'lv3-jk', 'lv4-bride'):
    obj = bpy.data.objects.get(form)
    rig = bpy.data.objects.get(form + 'Rig')
    if obj:
        obj.hide_render = form != 'lv1-baby'
    if rig:
        rig.hide_render = form != 'lv1-baby'

rig = bpy.data.objects['lv1-babyRig']
for track in rig.animation_data.nla_tracks:
    track.mute = True
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.location = (0, 0, 0)
    bone.rotation_mode = 'XYZ'
    bone.rotation_euler = (0, 0, 0)
    bone.scale = (1, 1, 1)
rig.pose.bones['eyelid.L'].scale = (0.001, 0.001, 0.001)
rig.pose.bones['eyelid.R'].scale = (0.001, 0.001, 0.001)
scene.frame_set(1)

scene.render.filepath = str(OUT / 'lv1-baby-hero.png')
bpy.ops.render.render(write_still=True)

# A straight-on companion makes face readability easy to compare with the 2D source.
camera.location = (0.0, -4.9, 1.28)
camera.data.ortho_scale = 2.70
camera.rotation_euler = (Vector((0.0, -0.02, 1.10)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.filepath = str(OUT / 'lv1-baby-front.png')
bpy.ops.render.render(write_still=True)

print('ALIGNMENT_PREVIEW_COUNT=2')
