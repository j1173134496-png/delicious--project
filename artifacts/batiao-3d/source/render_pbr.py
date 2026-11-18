"""Render the actual PBR materials from the saved Blender master project.

Run: blender --background source/batiao_master.blend --python source/render_pbr.py
"""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
FORMS = ('lv1-baby', 'lv2-genki', 'lv3-jk', 'lv4-bride')
PREVIEW_FRAME = {'idle': 1, 'happy': 18, 'eating': 18, 'sleeping': 35, 'sad': 30}
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x = 256
scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value = (1.0, 0.95, 0.96, 1.0)
background.inputs['Strength'].default_value = 0.60

for loc, energy, size in [((-3, -4, 6), 130, 5), ((3, -2, 4), 70, 4), ((0, 3, 4), 70, 4)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size

bpy.ops.object.camera_add(location=(0, -4.8, 1.05))
camera = bpy.context.object
camera.name = 'QA camera'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.45
scene.camera = camera

bpy.ops.mesh.primitive_plane_add(size=2)
plane = bpy.context.object
plane.name = 'QA pastel backdrop'
plane.parent = camera
plane.location = (0, 0, -10)
plane.rotation_euler = (0, 0, 0)
plane.scale = (5, 5, 5)
backdrop = bpy.data.materials.new('QA backdrop emission')
backdrop.use_nodes = True
backdrop.node_tree.nodes.clear()
emission = backdrop.node_tree.nodes.new('ShaderNodeEmission')
emission.inputs['Color'].default_value = (1, 0.95, 0.97, 1)
emission.inputs['Strength'].default_value = 1
output = backdrop.node_tree.nodes.new('ShaderNodeOutputMaterial')
backdrop.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
plane.data.materials.append(backdrop)


def camera_view(view):
    camera.location = {
        'front': (0, -4.8, 1.05),
        'side': (4.8, 0, 1.05),
        'back': (0, 4.8, 1.05),
    }[view]
    camera.rotation_euler = (Vector((0, 0, 1.02)) - camera.location).to_track_quat('-Z', 'Y').to_euler()


def reset_pose(rig):
    for bone in rig.pose.bones:
        bone.location = (0, 0, 0)
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)
    rig.pose.bones['eyelid.L'].scale = (0.001, 0.001, 0.001)
    rig.pose.bones['eyelid.R'].scale = (0.001, 0.001, 0.001)


def render(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


for form in FORMS:
    for other in FORMS:
        obj = bpy.data.objects[other]
        rig = bpy.data.objects[other + 'Rig']
        obj.hide_set(False)
        rig.hide_set(False)
        obj.hide_render = other != form
        rig.hide_render = other != form
    rig = bpy.data.objects[form + 'Rig']
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    rig.animation_data.action = None
    reset_pose(rig)
    scene.frame_set(0)
    for view in ('front', 'side', 'back'):
        camera_view(view)
        render(ROOT / 'previews' / 'pbr-turntable' / f'{form}-{view}.png')
    camera_view('front')
    for state, frame in PREVIEW_FRAME.items():
        rig.animation_data.action = None
        reset_pose(rig)
        rig.animation_data.action = bpy.data.actions[form + '__' + state]
        scene.frame_set(frame)
        render(ROOT / 'previews' / 'pbr-states' / f'{form}-{state}.png')
    rig.animation_data.action = None
    for track in rig.animation_data.nla_tracks:
        track.mute = False

print('PBR_PREVIEW_COUNT=32')
