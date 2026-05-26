Plugin.register('java_modded_export_fixer', {
    title: 'Java Modded Export Fixer',
    author: 'AcousticPeepo',
    icon: 'fa-file-code',
    description: 'Update Class export for modern Java 26.1',
    version: '1.0.0',
    variant: 'both',
    tags: ["Minecraft: Java Edition"],
    min_version: '5.1.4',

    onload() {

        this.compileListener = (custom_options) => {
            if (custom_options && typeof custom_options.model === 'string') {
                // Look for the configured export name or general project name in Blockbench's active project
                let fileName = 'CustomEntityModel';
                
                if (typeof Project !== 'undefined' && Project) {
                    fileName = Project.export_name || Project.name || Project.model_identifier || fileName;
                }

                // Sanitize filename just in case it contains spaces or illegal class characters
                fileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                custom_options.model = modifyExportedJava(custom_options.model, fileName);
            }
        };

        const bindCodec = () => {
            if (typeof Codecs !== 'undefined' && Codecs.modded_entity) {
                Codecs.modded_entity.removeListener('compile', this.compileListener);
                Codecs.modded_entity.on('compile', this.compileListener);
                return true;
            }
            return false;
        };

        if (!bindCodec()) {
            Blockbench.on('ready', () => {
                if (!bindCodec()) {
                    console.error('[Java Export Fixer] modded_entity codec still not found after app ready.');
                }
            });
        }
    },

    onunload() {
        if (typeof Codecs !== 'undefined' && Codecs.modded_entity && this.compileListener) {
            Codecs.modded_entity.removeListener('compile', this.compileListener);
            console.log('[Java Export Fixer] Exporter listener removed successfully.');
        }
    }
});

function modifyExportedJava(javaCode, fileName) {
    let code = javaCode;

    code = code.replace(
        /public class\s+\w+(?:<[^>]+>)?\s+extends\s+[\w<>\s]+\s*\{/,          
        `public class ${fileName} extends EntityModel<LivingEntityRenderState> {`
    );

    code = code.replace(
        /new ModelLayerLocation\(\s*new ResourceLocation\("([^"]+)"\s*,\s*"([^"]+)"\)\s*,\s*"main"\)/g,
        'new ModelLayerLocation(Identifier.fromNamespaceAndPath("$1", "$2"), "main")'
    );

    code = code.replace(
        /public\s+\w+\s*\(\s*ModelPart\s+root\s*\)\s*\{/,
        `public ${fileName}(ModelPart root) { \n\t\tsuper(root);\n`
    );

    code = code.replace(
        /\s*@Override\s+public void renderToBuffer\([\s\S]*?body\.render\([\s\S]*?\}\s*\}/,
        ''
    );

    const modernSetupAnim = `    @Override
    public void setupAnim(LivingEntityRenderState state) {
        super.setupAnim(state);

        this.body.xRot = state.xRot * (float) (Math.PI / 180.0);
        this.body.yRot = state.yRot * (float) (Math.PI / 180.0);

        float walk = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        this.right_arm.xRot = Mth.cos(walk * 0.6662F) * 1.4F * speed;
        this.left_arm.xRot = Mth.cos(walk * 0.6662F + (float) Math.PI) * 1.4F * speed;
        this.right_leg.xRot = Mth.cos(walk * 0.6662F + (float) Math.PI) * 1.4F * speed;
        this.left_leg.xRot = Mth.cos(walk * 0.6662F) * 1.4F * speed;
    }`;

    code = code.replace(
        /\s*@Override\s+public void setupAnim\(Entity entity[\s\S]*?\{\s*\}/,
        `\n\n${modernSetupAnim}`
    );

    
    return code;
}