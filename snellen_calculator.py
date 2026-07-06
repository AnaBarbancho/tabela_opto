from math import pi, tan


SNELLEN_DENOMINATORS = [200, 100, 70, 50, 40, 30, 25, 20, 15, 10]


def optotype_height_mm(distance_meters: float, denominator: int) -> float:
    minimum_angle_ratio = denominator / 20
    visual_angle_radians = (5 / 60) * (pi / 180) * minimum_angle_ratio
    return 2 * distance_meters * 1000 * tan(visual_angle_radians / 2)


def print_table() -> None:
    print("Tabela de tamanhos dos optotipos Snellen")
    print("A altura total do optotipo subtende 5 minutos de arco para 20/20.")
    print()
    print(f"{'Acuity':<8} {'3 m':>10} {'6 m':>10}")
    print("-" * 31)

    for denominator in SNELLEN_DENOMINATORS:
        size_3m = optotype_height_mm(3, denominator)
        size_6m = optotype_height_mm(6, denominator)
        print(f"20/{denominator:<5} {size_3m:>8.2f} mm {size_6m:>8.2f} mm")


if __name__ == "__main__":
    print_table()
