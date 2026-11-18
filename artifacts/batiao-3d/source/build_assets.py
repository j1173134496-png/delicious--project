"""Original procedural Batiao cat assets. Run with Blender --background --python.

Arguments after --: whitebox | full | export
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'whitebox'
FORMS = ('lv1-baby', 'lv2-genki', 'lv3-jk', 'lv4-bride')
BONES = (
    ('root', None, (0, 0, 0.05), (0, 0, 0.35)),
    ('body', 'root', (0, 0, 0.35), (0, 0, 1.07)),
    ('head', 'body', (0, 0, 1.02), (0, 0, 1.48)),
    ('ear.L', 'head', (-0.35, 0, 1.48), (-0.43, 0, 1.84)),
    ('ear.R', 'head', (0.35, 0, 1.48), (0.43, 0, 1.84)),
    ('jaw', 'head', (0, -0.44, 1.18), (0, -0.45, 1.08)),
    ('eyelid.L', 'head', (-0.22, -0.49, 1.48), (-0.22, -0.50, 1.42)),
    ('eyelid.R', 'head', (0.22, -0.49, 1.48), (0.22, -0.50, 1.42)),
    ('front_leg.L', 'body', (-0.28, -0.30, 0.70), (-0.32, -0.34, 0.17)),
    ('front_leg.R', 'body', (0.28, -0.30, 0.70), (0.32, -0.34, 0.17)),
    ('hind_leg.L', 'body', (-0.33, 0.22, 0.48), (-0.34, 0.20, 0.16)),
    ('hind_leg.R', 'body', (0.33, 0.22, 0.48), (0.34, 0.20, 0.16)),
    ('tail.01', 'body', (0.29, 0.36, 0.49), (0.55, 0.48, 0.63)),
    ('tail.02', 'tail.01', (0.55, 0.48, 0.63), (0.72, 0.49, 0.88)),
    ('tail.03', 'tail.02', (0.72, 0.49, 0.88), (0.75, 0.45, 1.04)),
)


def material(name, color, roughness=0.8):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return m


class MeshBuilder:
    def __init__(self, mats):
        self.v = []
        self.f = []
        self.fm = []
        self.weights = []
        self.mats = mats

    def add(self, verts, faces, mat, bone):
        off = len(self.v)
        self.v.extend(verts)
        self.f.extend(tuple(off + i for i in face) for face in faces)
        self.fm.extend([mat] * len(faces))
        self.weights.extend([bone] * len(verts))

    def ellipsoid(self, center, radius, mat, bone='body', seg=14, bands=7):
        cx, cy, cz = center
        rx, ry, rz = radius
        verts = [(cx, cy, cz + rz)]
        for j in range(1, bands):
            phi = math.pi * j / bands
            for i in range(seg):
                a = 2 * math.pi * i / seg
                verts.append((cx + rx * math.sin(phi) * math.cos(a),
                              cy + ry * math.sin(phi) * math.sin(a),
                              cz + rz * math.cos(phi)))
        bottom = len(verts)
        verts.append((cx, cy, cz - rz))
        faces = []
        for i in range(seg):
            faces.append((0, 1 + i, 1 + ((i + 1) % seg)))
        for j in range(bands - 2):
            a = 1 + j * seg
            b = a + seg
            for i in range(seg):
                k = (i + 1) % seg
                faces.append((a + i, b + i, b + k, a + k))
        last = 1 + (bands - 2) * seg
        for i in range(seg):
            faces.append((last + i, bottom, last + ((i + 1) % seg)))
        self.add(verts, faces, mat, bone)

    def cone(self, center, radius_bot, radius_top, height, mat, bone, seg=14):
        cx, cy, cz = center
        verts = []
        for r, z in ((radius_bot, cz - height / 2), (radius_top, cz + height / 2)):
            for i in range(seg):
                a = 2 * math.pi * i / seg
                verts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
        faces = [tuple(reversed(tuple(range(seg)))), tuple(range(seg, seg * 2))]
        for i in range(seg):
            k = (i + 1) % seg
            faces.append((i, k, seg + k, seg + i))
        self.add(verts, faces, mat, bone)

    def line(self, a, b, radius, mat, bone, seg=7):
        a, b = Vector(a), Vector(b)
        direction = (b - a).normalized()
        side = direction.cross(Vector((0, 1, 0)))
        if side.length < 0.01:
            side = direction.cross(Vector((1, 0, 0)))
        side.normalize()
        up = direction.cross(side).normalized()
        verts = []
        for c in (a, b):
            for i in range(seg):
                v = c + radius * (math.cos(2*math.pi*i/seg)*side + math.sin(2*math.pi*i/seg)*up)
                verts.append(tuple(v))
        faces = []
        for i in range(seg):
            k = (i + 1) % seg
            faces.append((i, k, seg+k, seg+i))
        self.add(verts, faces, mat, bone)

    def star(self, center, outer, inner, mat, bone='head', depth=0.04):
        x, y, z = center
        verts = []
        for yy in (y-depth/2, y+depth/2):
            for i in range(10):
                a = math.pi/2 + i*math.pi/5
                r = outer if i % 2 == 0 else inner
                verts.append((x+r*math.cos(a), yy, z+r*math.sin(a)))
        faces = [tuple(range(9, -1, -1)), tuple(range(10, 20))]
        faces.extend((i, (i+1)%10, 10+(i+1)%10, 10+i) for i in range(10))
        self.add(verts, faces, mat, bone)

    def finish(self, name, rig=None):
        mesh = bpy.data.meshes.new(name+'Mesh')
        mesh.from_pydata(self.v, [], self.f)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        for m in self.mats:
            mesh.materials.append(m)
        for poly, index in zip(mesh.polygons, self.fm):
            poly.material_index = index
            poly.use_smooth = True
        if rig:
            groups = {name: obj.vertex_groups.new(name=name) for name, *_ in BONES}
            for idx, bone in enumerate(self.weights):
                groups[bone].add([idx], 1.0, 'REPLACE')
            mod = obj.modifiers.new('Batiao skin', 'ARMATURE')
            mod.object = rig
            obj.parent = rig
        return obj


def rig_for(form):
    arm = bpy.data.armatures.new(form+'RigData')
    rig = bpy.data.objects.new(form+'Rig', arm)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, parent, head, tail in BONES:
        b = arm.edit_bones.new(name)
        b.head = head
        b.tail = tail
        if parent:
            b.parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.select_set(False)
    return rig


def add_cat(form, whitebox=False):
    white = material(form+' whitebox', (0.92, 0.90, 0.89)) if whitebox else None
    mats = [white] if whitebox else [
        material(form+' pearl fur', (1.00, 0.72, 0.78), 0.72),
        material(form+' petal pink', (0.97, 0.39, 0.58)),
        material(form+' cocoa eyes', (0.11, 0.07, 0.09), 0.25),
        material(form+' soft blush', (0.99, 0.68, 0.74)),
        material(form+' costume', (0.48, 0.63, 0.83) if form == 'lv3-jk' else (0.99, 0.94, 0.96)),
        material(form+' gold', (0.96, 0.77, 0.36), 0.4),
    ]
    F, P, E, B, C, G = (0,)*6 if whitebox else range(6)
    mb = MeshBuilder(mats)
    # Baby silhouette: oversized head, short chubby body, and soft cheek volume.
    mb.ellipsoid((0, 0.02, 0.68), (0.43, 0.37, 0.48), F, 'body', 20, 11)
    mb.ellipsoid((0, -0.04, 1.40), (0.70, 0.57, 0.57), F, 'head', 24, 12)
    for side in (-1, 1):
        mb.ellipsoid((side*0.39, -0.19, 1.19), (0.34, 0.37, 0.25), F, 'head', 16, 8)
    mb.ellipsoid((0, -0.22, 0.75), (0.28, 0.20, 0.33), C if form == 'lv3-jk' else F, 'body')
    for side in (-1, 1):
        side_name = 'L' if side < 0 else 'R'
        x = side*0.30
        mb.ellipsoid((x, -0.26, 0.32), (0.15, 0.18, 0.32), F, 'front_leg.'+side_name, 14, 7)
        mb.ellipsoid((x, -0.38, 0.13), (0.19, 0.25, 0.12), F, 'front_leg.'+side_name, 14, 7)
        mb.ellipsoid((side*0.34, 0.20, 0.23), (0.22, 0.24, 0.21), F, 'hind_leg.'+side_name)
        mb.ellipsoid((side*0.43, 0.01, 1.72), (0.23, 0.16, 0.24), F, 'ear.'+side_name)
        mb.cone((side*0.43, 0.01, 1.86), 0.235, 0.025, 0.50, F, 'ear.'+side_name)
        mb.cone((side*0.43, -0.12, 1.84), 0.13, 0.01, 0.34, P, 'ear.'+side_name)
        # Layered eye: cream sclera, cocoa iris, and two warm catchlights.
        mb.ellipsoid((side*0.255, -0.535, 1.48), (0.225, 0.095, 0.255), F, 'head', 18, 9)
        mb.ellipsoid((side*0.255, -0.625, 1.48), (0.165, 0.050, 0.205), E, 'head', 18, 9)
        mb.ellipsoid((side*0.205, -0.675, 1.56), (0.050, 0.018, 0.060), C, 'head', 10, 5)
        mb.ellipsoid((side*0.300, -0.676, 1.42), (0.022, 0.012, 0.028), C, 'head', 8, 4)
        mb.ellipsoid((side*0.42, -0.60, 1.22), (0.13, 0.035, 0.075), B, 'head', 12, 6)
        mb.ellipsoid((side*0.235, -0.603, 1.46), (0.17, 0.048, 0.19), F, 'eyelid.'+side_name, 14, 7)
    mb.ellipsoid((0, -0.675, 1.31), (0.050, 0.025, 0.038), P, 'head', 12, 6)
    mb.line((-0.03, -0.675, 1.28), (0.03, -0.675, 1.28), 0.010, P, 'head', 8)
    # Open happy mouth with a visible tongue; this is the main expression cue.
    mb.ellipsoid((0, -0.670, 1.13), (0.20, 0.050, 0.155), E, 'jaw', 18, 9)
    mb.ellipsoid((0, -0.730, 1.075), (0.115, 0.020, 0.065), B, 'jaw', 14, 6)
    # Two soft brows make the oversized eyes feel lively instead of vacant.
    mb.line((-0.39, -0.60, 1.76), (-0.16, -0.63, 1.79), 0.018, P, 'head', 8)
    mb.line((0.16, -0.63, 1.79), (0.39, -0.60, 1.76), 0.018, P, 'head', 8)
    # Three short, independently animated tail links.
    mb.line((0.29, 0.35, 0.48), (0.56, 0.48, 0.63), 0.115, F, 'tail.01', 10)
    mb.line((0.55, 0.48, 0.62), (0.73, 0.48, 0.87), 0.10, F, 'tail.02', 10)
    mb.ellipsoid((0.75, 0.47, 0.99), (0.13, 0.13, 0.18), F, 'tail.03', 12, 6)
    # Each form has its own three-dimensional recognition details.
    if form == 'lv1-baby':
        # Large satin bow on the viewer's right, matching the 2D reference.
        mb.ellipsoid((0.29, -0.52, 1.78), (0.22, 0.085, 0.15), P, 'head', 16, 8)
        mb.ellipsoid((0.58, -0.52, 1.78), (0.22, 0.085, 0.15), P, 'head', 16, 8)
        mb.ellipsoid((0.435, -0.59, 1.78), (0.085, 0.055, 0.085), G, 'head', 14, 7)
    elif form == 'lv2-genki':
        mb.star((-0.39, -0.14, 1.84), 0.15, 0.07, G)
        mb.ellipsoid((-0.13, -0.39, 0.95), (0.13, 0.05, 0.09), P, 'body')
        mb.ellipsoid((0.13, -0.39, 0.95), (0.13, 0.05, 0.09), P, 'body')
        mb.ellipsoid((0, -0.45, 0.95), (0.06, 0.05, 0.07), G, 'body')
    elif form == 'lv3-jk':
        mb.cone((0, 0.02, 0.59), 0.55, 0.37, 0.42, C, 'body', 18)
        mb.ellipsoid((0, -0.30, 1.02), (0.39, 0.12, 0.10), C, 'body')
        mb.line((-0.30, -0.38, 1.05), (0, -0.43, 0.75), 0.04, P, 'body')
        mb.line((0.30, -0.38, 1.05), (0, -0.43, 0.75), 0.04, P, 'body')
        mb.ellipsoid((0, -0.44, 0.76), (0.10, 0.045, 0.065), P, 'body')
    else:
        mb.cone((0, 0.02, 0.55), 0.63, 0.30, 0.52, C, 'body', 20)
        mb.ellipsoid((0, 0.21, 1.60), (0.56, 0.27, 0.43), C, 'head', 18, 8)
        mb.ellipsoid((0, -0.02, 1.87), (0.24, 0.13, 0.075), G, 'head')
        mb.ellipsoid((0, -0.39, 0.92), (0.16, 0.06, 0.12), P, 'body')
    rig = None if whitebox else rig_for(form)
    obj = mb.finish(form, rig)
    return obj, rig, len(mb.f), len(mb.v)


def set_camera(view):
    bpy.ops.object.camera_add(location={'front': (0, -4.8, 1.05), 'side': (4.8, 0, 1.05), 'back': (0, 4.8, 1.05)}[view])
    cam = bpy.context.object
    cam.name = 'PreviewCamera'
    direction = Vector((0, 0, 1.02)) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 2.45
    bpy.context.scene.camera = cam
    return cam


def render_views(objects, suffix):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x = 256
    scene.render.resolution_y = 256
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.world.color = (0.98, 0.96, 0.97)
    out = ROOT / 'previews' / suffix
    out.mkdir(parents=True, exist_ok=True)
    cam = set_camera('front')
    for form, obj, rig in objects:
        if rig:
            for track in rig.animation_data.nla_tracks:
                track.mute = True
            pose_reset(rig)
            scene.frame_set(0)
        for other_form, other_obj, other_rig in objects:
            other_obj.hide_render = other_form != form
            if other_rig:
                other_rig.hide_render = other_form != form
        for view in ('front', 'side', 'back'):
            cam.location = {'front': (0, -4.8, 1.05), 'side': (4.8, 0, 1.05), 'back': (0, 4.8, 1.05)}[view]
            cam.rotation_euler = (Vector((0, 0, 1.02)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
            scene.render.filepath = str(out / f'{form}-{view}.png')
            bpy.ops.render.render(write_still=True)
        if rig:
            for track in rig.animation_data.nla_tracks:
                track.mute = False
    bpy.data.objects.remove(cam, do_unlink=True)
    for form, obj, rig in objects:
        obj.hide_render = False
        if rig:
            rig.hide_render = False


CLIP_END = {'idle': 48, 'happy': 36, 'eating': 48, 'sleeping': 72, 'sad': 60}
CLIP_MID = {'idle': 24, 'happy': 18, 'eating': 18, 'sleeping': 35, 'sad': 30}
CLIP_PREVIEW = {'idle': 1, 'happy': 18, 'eating': 18, 'sleeping': 35, 'sad': 30}
STATE_CHANNELS = {
    'idle': {'body': 'scale', 'tail.01': 'rotation_euler', 'tail.02': 'rotation_euler',
             'eyelid.L': 'scale', 'eyelid.R': 'scale'},
    'happy': {'root': 'location', 'body': 'rotation_euler', 'jaw': 'rotation_euler', 'front_leg.L': 'rotation_euler',
              'front_leg.R': 'rotation_euler', 'ear.L': 'rotation_euler', 'ear.R': 'rotation_euler',
              'tail.01': 'rotation_euler', 'tail.02': 'rotation_euler'},
    'eating': {'body': 'rotation_euler', 'head': 'rotation_euler', 'jaw': 'rotation_euler',
               'front_leg.L': 'rotation_euler', 'front_leg.R': 'rotation_euler'},
    'sleeping': {'root': 'location', 'body': 'rotation_euler', 'head': 'rotation_euler',
                 'front_leg.L': 'rotation_euler', 'front_leg.R': 'rotation_euler',
                 'tail.01': 'rotation_euler', 'tail.02': 'rotation_euler',
                 'eyelid.L': 'scale', 'eyelid.R': 'scale'},
    'sad': {'head': 'rotation_euler', 'ear.L': 'rotation_euler', 'ear.R': 'rotation_euler',
            'tail.01': 'rotation_euler', 'tail.02': 'rotation_euler'},
}


def pose_reset(rig):
    for bone in rig.pose.bones:
        bone.rotation_mode = 'XYZ'
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)
    rig.pose.bones['eyelid.L'].scale = (0.001, 0.001, 0.001)
    rig.pose.bones['eyelid.R'].scale = (0.001, 0.001, 0.001)


def pose_at(rig, state, frame):
    pose_reset(rig)
    b = rig.pose.bones
    middle = frame == CLIP_MID[state]
    if middle:
        if state == 'idle':
            b['body'].scale = (1.02, 1.02, 1.035)
            b['tail.01'].rotation_euler[1] = 0.12
            b['tail.02'].rotation_euler[1] = -0.10
            b['eyelid.L'].scale = (1, 1, 1)
            b['eyelid.R'].scale = (1, 1, 1)
        elif state == 'happy':
            b['root'].location[2] = 0.16
            b['body'].rotation_euler[0] = -0.12
            b['jaw'].rotation_euler[0] = -0.20
            b['front_leg.L'].rotation_euler[0] = -0.68
            b['front_leg.R'].rotation_euler[0] = -0.48
            b['ear.L'].rotation_euler[1] = -0.16
            b['ear.R'].rotation_euler[1] = 0.16
            b['tail.01'].rotation_euler[1] = 0.30
            b['tail.02'].rotation_euler[1] = 0.22
        elif state == 'eating':
            b['body'].rotation_euler[0] = 0.18
            b['head'].rotation_euler[0] = 0.19
            b['jaw'].rotation_euler[0] = -0.28
            b['front_leg.L'].rotation_euler[0] = 0.36
            b['front_leg.R'].rotation_euler[0] = 0.26
        elif state == 'sleeping':
            b['root'].location[2] = -0.12
            b['body'].rotation_euler[0] = 0.38
            b['head'].rotation_euler[0] = 0.17
            b['front_leg.L'].rotation_euler[0] = 0.58
            b['front_leg.R'].rotation_euler[0] = 0.58
            b['tail.01'].rotation_euler[1] = -0.36
            b['tail.02'].rotation_euler[1] = -0.29
        elif state == 'sad':
            b['head'].rotation_euler[0] = 0.20
            b['ear.L'].rotation_euler[1] = 0.16
            b['ear.R'].rotation_euler[1] = -0.16
            b['tail.01'].rotation_euler[1] = -0.25
            b['tail.02'].rotation_euler[1] = -0.14
    if state == 'sleeping':
        # Sleeping loops in a curled pose with only a gentle breathing variation.
        if not middle:
            b['root'].location[2] = -0.10
            b['body'].rotation_euler[0] = 0.35
            b['head'].rotation_euler[0] = 0.17
            b['front_leg.L'].rotation_euler[0] = 0.55
            b['front_leg.R'].rotation_euler[0] = 0.55
            b['tail.01'].rotation_euler[1] = -0.34
            b['tail.02'].rotation_euler[1] = -0.27
        b['eyelid.L'].scale = (1, 1, 1)
        b['eyelid.R'].scale = (1, 1, 1)
    for bone_name, prop in STATE_CHANNELS[state].items():
        b[bone_name].keyframe_insert(data_path=prop, frame=frame, group=bone_name)


def animate_rig(rig, form):
    rig.animation_data_create()
    actions = {}
    for state, end in CLIP_END.items():
        rig.animation_data.action = None
        pose_reset(rig)
        pose_at(rig, state, 1)
        action = rig.animation_data.action
        action.name = form + '__' + state
        pose_at(rig, state, CLIP_MID[state])
        pose_at(rig, state, end)
        actions[state] = action
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = state
        strip = track.strips.new(state, 1, action)
        strip.name = state
        strip.action_frame_start = 1
        strip.action_frame_end = end
    pose_reset(rig)
    return actions


def render_states(objects, actions):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x = 256
    scene.render.resolution_y = 256
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_cavity = True
    out = ROOT / 'previews' / 'states'
    out.mkdir(parents=True, exist_ok=True)
    cam = set_camera('front')
    for form, obj, rig in objects:
        for other_form, other_obj, other_rig in objects:
            other_obj.hide_render = other_form != form
            other_rig.hide_render = other_form != form
        for track in rig.animation_data.nla_tracks:
            track.mute = True
        for state, action in actions[form].items():
            pose_reset(rig)
            rig.animation_data.action = action
            scene.frame_set(CLIP_PREVIEW[state])
            scene.render.filepath = str(out / f'{form}-{state}.png')
            bpy.ops.render.render(write_still=True)
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks:
            track.mute = False
    bpy.data.objects.remove(cam, do_unlink=True)
    scene.frame_set(1)
    for form, obj, rig in objects:
        obj.hide_render = False
        rig.hide_render = False


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    objects = []
    for form in FORMS:
        obj, rig, faces, verts = add_cat(form, MODE == 'whitebox')
        print(f'CAT_BUILD {form} faces={faces} vertices={verts} whitebox={MODE == "whitebox"}')
        objects.append((form, obj, rig))
    if MODE == 'whitebox':
        render_views(objects, 'whitebox')
    elif MODE == 'full':
        actions = {form: animate_rig(rig, form) for form, obj, rig in objects}
        render_views(objects, 'turntable')
        render_states(objects, actions)
        for form, obj, rig in objects[1:]:
            obj.hide_set(True)
            rig.hide_set(True)
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source' / 'batiao_master.blend'))


if __name__ == '__main__':
    main()
