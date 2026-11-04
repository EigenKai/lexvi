"""Rebuild the checked-in role-A dataset without network or API key."""
from scripts import build_data, curate_graph, build_questions, build_demo, audit_data, export_a_docs


def main():
    build_data.main()
    curate_graph.main()
    build_questions.main()
    build_demo.main()
    audit_data.main()
    export_a_docs.main()


if __name__ == "__main__":
    main()
