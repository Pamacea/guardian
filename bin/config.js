const path = require('path');

const config = {
  IMAGE_NAME: 'guardian-tools',
  CONTAINER_NAME: 'guardian-tools',

  get PROMPT_SRC() {
    return path.join(__dirname, '..', 'prompt', 'REVIEW.md');
  },

  get PROMPT_DEST() {
    return path.join(process.cwd(), '.guardian', 'REVIEW.md');
  },

  get DOCKERFILE() {
    return path.join(__dirname, '..', 'docker', 'Dockerfile');
  },

  get GUARDIAN_DIR() {
    return path.join(process.cwd(), '.guardian');
  },

  get DOCKERFILE_DIR() {
    return path.dirname(this.DOCKERFILE);
  },

  PROJECT_MARKERS: [
    'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
    'go.mod', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json', 'Cargo.toml'
  ]
};

module.exports = { config };
